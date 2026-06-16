'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api-service';
import type { ProductGroupMap, DayProduct, DayKeg } from '@/types/db';
import { ProgressBar } from '../ui/progress-bar';
import { ProductBalanceStep } from './product-balance-step';
import { KegBalanceStep } from './keg-balance-step';
import { FinalStep } from './final-step';
import { UnifiedBalanceView } from './unified-balance-view';

interface Props {
  date: string;
}

export function BalanceWizard({ date }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productsByGroup, setProductsByGroup] = useState<ProductGroupMap>({});
  const [dayProducts, setDayProducts] = useState<Record<string, DayProduct>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [tomorrowDateStr, setTomorrowDateStr] = useState('');
  const [kegData, setKegData] = useState<DayKeg>({
    opening: 0,
    added: 0,
    closing: null,
    buy_price: 0,
    sell_price: 0,
    total_money: null,
    overflow: 0,
    date,
  });
  const [leftCounts, setLeftCounts] = useState<Record<string, number | null>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [bottledSales, setBottledSales] = useState(0);
  const [viewMode, setViewMode] = useState<'step' | 'unified'>('unified');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiService.getDailyState(date)
      .then((data) => {
        const grouped: ProductGroupMap = {};
        const dpMap: Record<string, DayProduct> = {};
        const lefts: Record<string, number | null> = {};

        // Retrieve drafts
        const draftLeftsStr = localStorage.getItem(`draft_balance_left_${date}`);
        const draftLefts = draftLeftsStr ? JSON.parse(draftLeftsStr) : {};
        const draftKegStr = localStorage.getItem(`draft_balance_keg_${date}`);
        const draftKeg = draftKegStr ? JSON.parse(draftKegStr) : null;

        if (data.products) {
          for (const p of (data.products as any[])) {
            const g = p.group_name || 'Others';
            if (!grouped[g]) grouped[g] = [];
            
            grouped[g].push({
              id: p.product_id,
              name: p.name || '',
              group_name: g,
              buy_price: p.buy_price || 0,
              sell_price: p.sell_price || 0,
            });

            dpMap[p.product_id] = {
              ...p,
              opening: Number(p.opening || 0),
              added: Number(p.added || 0),
              left_count: p.left_count !== null && p.left_count !== undefined ? Number(p.left_count) : null,
              buy_price: Number(p.buy_price || 0),
              sell_price: Number(p.sell_price || 0),
            };
            const totalStock = Number(p.opening || 0) + Number(p.added || 0);
            
            // Prefer draft over null
            let initialLeft = totalStock === 0 ? 0 : (p.left_count !== null && p.left_count !== undefined ? Number(p.left_count) : null);
            if (initialLeft === null && draftLefts[p.product_id] !== undefined) {
              initialLeft = draftLefts[p.product_id];
            }
            lefts[p.product_id] = initialLeft;
          }
        }

        setProductsByGroup(grouped);
        setDayProducts(dpMap);
        setLeftCounts(lefts);

        if (data.keg) {
          setKegData({
            ...data.keg,
            opening: Number(data.keg.opening || 0),
            added: Number(data.keg.added || 0),
            closing: draftKeg?.closing !== undefined ? draftKeg.closing : (data.keg.closing !== null && data.keg.closing !== undefined ? Number(data.keg.closing) : null),
            buy_price: Number(data.keg.buy_price || 0),
            sell_price: Number(data.keg.sell_price || 0),
            total_money: draftKeg?.total_money !== undefined ? draftKeg.total_money : (data.keg.total_money !== null && data.keg.total_money !== undefined ? Number(data.keg.total_money) : null),
            overflow: Number(data.keg.overflow || 0),
            expenses: draftKeg?.expenses !== undefined ? draftKeg.expenses : Number(data.keg.expenses || 0),
          });
        }

        // Compute initial bottled sales (only products with actual balance data)
        let initialSales = 0;
        for (const p of data.products) {
          const totalStock = Number(p.opening || 0) + Number(p.added || 0);
          if (totalStock > 0 && p.left_count != null) {
            const sold = Math.max(0, totalStock - Number(p.left_count));
            initialSales += sold * Number(p.sell_price || 0);
          }
        }
        setBottledSales(initialSales);
        
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load daily state for balancing:', err);
        setLoading(false);
      });
  }, [date]);

  const groupNames = Object.keys(productsByGroup).sort();
  const hasKegStock = kegData.opening > 0 || kegData.added > 0;
  const totalSteps = groupNames.length + (hasKegStock ? 2 : 1); // groups + optional keg + final
  const isLastStep = currentStep === totalSteps - 1;
  const isKegStep = hasKegStock && currentStep === groupNames.length;
  const isFinalStep = currentStep === groupNames.length + (hasKegStock ? 1 : 0);

  // Check validation for current group step (or all if unified)
  const getStepValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (viewMode === 'unified') {
      // In unified mode, check everything
      for (const group of groupNames) {
        for (const p of productsByGroup[group] || []) {
          const dp = dayProducts[p.id];
          const total = (dp?.opening || 0) + (dp?.added || 0);
          const left = leftCounts[p.id];
          if (total > 0 && left == null) {
            errors.push(`"${p.name}" balance count is required.`);
          } else if (left != null && left > total) {
            errors.push(`"${p.name}" balance (${left}) exceeds total available stock (${total}).`);
          }
        }
      }
      if (hasKegStock && kegData) {
        if (kegData.closing == null) {
          errors.push('Keg balance (closing count) is required.');
        } else {
          const totalKegs = kegData.opening + kegData.added;
          if (kegData.closing > totalKegs) {
            errors.push(`Keg balance (${kegData.closing}) exceeds total available (${totalKegs}).`);
          }
        }
      }
    } else {
      // In step mode, only check the active step
      if (currentStep < groupNames.length) {
        const activeGroup = groupNames[currentStep];
        const productsInGroup = productsByGroup[activeGroup] || [];
        for (const p of productsInGroup) {
          const dp = dayProducts[p.id];
          const total = (dp?.opening || 0) + (dp?.added || 0);
          const left = leftCounts[p.id];
          if (total > 0 && left == null) {
            errors.push(`"${p.name}" balance count is required.`);
          } else if (left != null && left > total) {
            errors.push(`"${p.name}" balance (${left}) exceeds total available stock (${total}).`);
          }
        }
      } else if (isKegStep && kegData) {
        if (kegData.closing == null) {
          errors.push('Keg balance (closing count) is required.');
        } else {
          const totalKegs = kegData.opening + kegData.added;
          if (kegData.closing > totalKegs) {
            errors.push(`Keg balance (${kegData.closing}) exceeds total available (${totalKegs}).`);
          }
        }
      }
    }
    
    return errors;
  };

  const stepErrors = getStepValidationErrors();
  const hasErrors = stepErrors.length > 0;

  const handleLeftChange = useCallback((productId: string, value: number) => {
    setLeftCounts((prev) => {
      const updatedLefts = { ...prev, [productId]: value };
      localStorage.setItem(`draft_balance_left_${date}`, JSON.stringify(updatedLefts));

      // Recalculate bottled sales (skip products not yet balanced)
      let total = 0;
      for (const [pid, left] of Object.entries(updatedLefts)) {
        if (left == null) continue;
        const dp = dayProducts[pid];
        if (dp) {
          const totalStock = dp.opening + dp.added;
          const sold = Math.max(0, totalStock - left);
          total += sold * (dp.sell_price || 0);
        }
      }
      setBottledSales(total);
      
      return updatedLefts;
    });
  }, [dayProducts, date]);

  const handleKegUpdate = useCallback((field: string, value: number) => {
    setKegData((prev) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem(`draft_balance_keg_${date}`, JSON.stringify(updated));
      return updated;
    });
  }, [date]);

  const handleTotalMoneyChange = useCallback((value: number) => {
    setKegData((prev) => {
      const updated = { ...prev, total_money: value };
      localStorage.setItem(`draft_balance_keg_${date}`, JSON.stringify(updated));
      return updated;
    });
  }, [date]);

  const handleExpensesChange = useCallback((value: number) => {
    setKegData((prev) => {
      const updated = { ...prev, expenses: value };
      localStorage.setItem(`draft_balance_keg_${date}`, JSON.stringify(updated));
      return updated;
    });
  }, [date]);

  const handleSaveSingleBalance = useCallback(async (productId: string) => {
    const leftCount = leftCounts[productId];
    const dp = dayProducts[productId];
    if (leftCount == null) return;
    setSavingId(productId);
    try {
      await apiService.saveSingleProductBalance(date, {
        product_id: productId,
        left_count: leftCount,
        opening: dp?.opening ?? 0,
        added: dp?.added ?? 0,
        buy_price: dp?.buy_price ?? 0,
        sell_price: dp?.sell_price ?? 0,
      });
    } catch (err) {
      console.error('Failed to save balance:', err);
      alert('Failed to save balance.');
    } finally {
      setSavingId(null);
    }
  }, [date, leftCounts, dayProducts]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleCloseDay = async () => {
    // Validate all products with stock have balance entered
    for (const [productId, leftCount] of Object.entries(leftCounts)) {
      const dp = dayProducts[productId];
      const total = (dp?.opening || 0) + (dp?.added || 0);
      if (total > 0 && leftCount == null) {
        alert('Please enter balance for all products before closing the day.');
        return;
      }
      if (leftCount != null && leftCount > total) {
        alert(`Cannot close day: Product "${dp?.name || productId}" is oversold. Balance (${leftCount}) exceeds total stock (${total}).`);
        return;
      }
    }
    if (hasKegStock) {
      if (kegData.closing == null) {
        alert('Keg closing count is required.');
        return;
      }
    }
    if (kegData.total_money == null || kegData.total_money <= 0) {
      alert('Total money collected is mandatory and must be greater than KSh 0.');
      return;
    }

    setSaving(true);
    try {
      const productsList: DayProduct[] = Object.entries(leftCounts).map(([productId, leftCount]) => {
        const dp = dayProducts[productId];
        return {
          date,
          product_id: productId,
          opening: dp?.opening ?? 0,
          added: dp?.added ?? 0,
          left_count: leftCount ?? 0,
          buy_price: dp?.buy_price ?? 0,
          sell_price: dp?.sell_price ?? 0,
        };
      });

      const safeKeg: DayKeg = {
        opening: kegData.opening ?? 0,
        added: kegData.added ?? 0,
        closing: hasKegStock ? (kegData.closing ?? null) : 0,
        buy_price: kegData.buy_price ?? 0,
        sell_price: kegData.sell_price ?? 0,
        total_money: kegData.total_money ?? null,
        overflow: kegData.overflow ?? 0,
        expenses: kegData.expenses ?? 0,
        date: kegData.date || date,
      };

      await apiService.closeDay(date, productsList, safeKeg, safeKeg.total_money ?? 0);

      // Clear drafts on successful close
      localStorage.removeItem(`draft_balance_left_${date}`);
      localStorage.removeItem(`draft_balance_keg_${date}`);

      // Advance to next day calculation
      const currentDateObj = new Date(date + 'T00:00:00');
      currentDateObj.setDate(currentDateObj.getDate() + 1);
      const tomorrowStr = currentDateObj.toISOString().split('T')[0];

      setTomorrowDateStr(tomorrowStr);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Close day failed', err);
      alert('Failed to close day. Please check inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (groupNames.length === 0) {
    return (
      <div className="card text-center py-12 border border-dashed border-primary/20">
        <p className="text-primary/60 mb-4 font-medium">No products found for this day.</p>
        <p className="text-sm text-primary/40 mb-6">Add products in the catalog and save stock for today first.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push('/products')} className="btn-primary py-3 px-6">
            Manage Products
          </button>
          <button onClick={() => router.push(`/stock?date=${date}`)} className="btn-outline py-3 px-6">
            Go to Stock
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = [...groupNames, ...(hasKegStock ? ['Keg Balance'] : []), 'Final'];

  return (
    <div className="flex flex-col gap-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs font-medium text-primary/60">View:</span>
        <div className="flex bg-primary/5 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('step')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'step' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-primary'
            }`}
          >
            Steps
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'unified' ? 'bg-white text-primary shadow-sm' : 'text-primary/50 hover:text-primary'
            }`}
          >
            All in One
          </button>
        </div>
      </div>

      {viewMode === 'step' ? (
        <>
          {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {stepLabels.map((label, idx) => (
          <button
            key={label}
            onClick={() => setCurrentStep(idx)}
            className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
              currentStep === idx
                ? 'bg-[#4A2E1B] text-white shadow-md'
                : 'bg-white text-[#4A2E1B] border border-[#4A2E1B]/20 hover:bg-[#4A2E1B]/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ProgressBar current={currentStep} total={totalSteps} labels={stepLabels} />

      {/* Validation Error Banner */}
      {hasErrors && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-sm">
          <p className="font-semibold mb-1">Stock Validation Warning:</p>
          <ul className="list-disc pl-5 space-y-1">
            {stepErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {!isKegStep && !isFinalStep && (
        <ProductBalanceStep
          date={date}
          groupName={groupNames[currentStep]}
          products={productsByGroup[groupNames[currentStep]] ?? []}
          dayProducts={dayProducts}
          leftCounts={leftCounts}
          onLeftChange={handleLeftChange}
        />
      )}

      {isKegStep && (
        <KegBalanceStep
          opening={kegData.opening}
          added={kegData.added}
          closing={kegData.closing ?? 0}
          buyPrice={kegData.buy_price}
          sellPrice={kegData.sell_price}
          onUpdate={handleKegUpdate}
        />
      )}

      {isFinalStep && (
        <FinalStep
          kegData={kegData}
          bottledSales={bottledSales}
          onTotalMoneyChange={handleTotalMoneyChange}
          onExpensesChange={handleExpensesChange}
        />
      )}

      <div className="flex justify-between gap-3 pt-4">
        <button onClick={handlePrev} disabled={currentStep === 0} className="btn-outline flex-1">
          Previous
        </button>
        {isLastStep ? (
          <button
            onClick={handleCloseDay}
            disabled={saving || hasErrors || kegData.total_money == null || kegData.total_money <= 0}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Closing...' : 'Close Day'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={hasErrors}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
        </>
      ) : (
        <UnifiedBalanceView
          date={date}
          products={Object.values(dayProducts)}
          leftCounts={leftCounts}
          onLeftChange={handleLeftChange}
          onSave={handleSaveSingleBalance}
          savingId={savingId}
          kegData={kegData}
          hasKegStock={hasKegStock}
          bottledSales={bottledSales}
          onKegUpdate={handleKegUpdate}
          onTotalMoneyChange={handleTotalMoneyChange}
          onExpensesChange={handleExpensesChange}
          onCloseDay={handleCloseDay}
          saving={saving}
          hasErrors={hasErrors}
        />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-primary/10 flex flex-col gap-4 transform transition-transform scale-100">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/10 text-success">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary">Day Balanced Successfully!</h3>
                <p className="text-xs text-primary/60">Sales and stock values are permanently committed.</p>
              </div>
            </div>
            
            <p className="text-sm text-primary/70">
              Would you like to proceed to the next day (<strong className="text-primary font-bold">{tomorrowDateStr}</strong>)?
            </p>
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/?date=${date}`);
                }}
                className="btn-outline flex-1 py-2 text-sm"
              >
                Stay on {date}
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/?date=${tomorrowDateStr}`);
                }}
                className="btn-primary flex-1 py-2 text-sm"
              >
                Go to {tomorrowDateStr}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

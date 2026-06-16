'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api-service';
import type { ProductGroupMap, DayProduct, DayKeg } from '@/types/db';
import { ProgressBar } from '../ui/progress-bar';
import { ProductGroupStep } from './product-group-step';
import { KegStockStep } from './keg-stock-step';
import { UnifiedStockView } from './unified-stock-view';

interface Props {
  date: string;
}

export function StockWizard({ date }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productsByGroup, setProductsByGroup] = useState<ProductGroupMap>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [productData, setProductData] = useState<Record<string, any>>({});
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
  const [viewMode, setViewMode] = useState<'step' | 'unified'>('unified');

  useEffect(() => {
    setLoading(true);
    apiService.getDailyState(date)
      .then((data) => {
        const grouped: ProductGroupMap = {};
        const dataMap: Record<string, any> = {};

        const draftProductsStr = localStorage.getItem(`draft_stock_products_${date}`);
        const draftProducts = draftProductsStr ? JSON.parse(draftProductsStr) : {};
        const draftKegStr = localStorage.getItem(`draft_stock_keg_${date}`);
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

            const draftP = draftProducts[p.product_id];
            dataMap[p.product_id] = {
              product_id: p.product_id,
              name: p.name || '',
              group_name: g,
              opening: Number(p.opening || 0),
              added: draftP?.added !== undefined ? draftP.added : Number(p.added || 0),
              buy_price: draftP?.buy_price !== undefined ? draftP.buy_price : Number(p.buy_price || 0),
              sell_price: draftP?.sell_price !== undefined ? draftP.sell_price : Number(p.sell_price || 0),
              left_count: p.left_count !== null && p.left_count !== undefined ? Number(p.left_count) : null,
            };
          }
        }

        setProductData(dataMap);
        setProductsByGroup(grouped);
        
        if (data.keg) {
          setKegData({
            ...data.keg,
            opening: Number(data.keg.opening || 0),
            added: draftKeg?.added !== undefined ? draftKeg.added : Number(data.keg.added || 0),
            closing: data.keg.closing !== null && data.keg.closing !== undefined ? Number(data.keg.closing) : null,
            buy_price: draftKeg?.buy_price !== undefined ? draftKeg.buy_price : Number(data.keg.buy_price || 0),
            sell_price: draftKeg?.sell_price !== undefined ? draftKeg.sell_price : Number(data.keg.sell_price || 0),
            total_money: data.keg.total_money !== null && data.keg.total_money !== undefined ? Number(data.keg.total_money) : null,
            overflow: Number(data.keg.overflow || 0),
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load daily state:', err);
        setLoading(false);
      });
  }, [date]);

  const groupNames = Object.keys(productsByGroup).sort();
  const totalSteps = groupNames.length + 1;
  const isLastStep = currentStep === totalSteps - 1;
  const isKegStep = currentStep === groupNames.length;

  const handleProductUpdate = useCallback((productId: string, field: string, value: number) => {
    setProductData((prev) => {
      const updated = {
        ...prev,
        [productId]: { ...prev[productId], [field]: value },
      };
      localStorage.setItem(`draft_stock_products_${date}`, JSON.stringify(updated));
      return updated;
    });
  }, [date]);

  const handleKegUpdate = useCallback((field: string, value: number) => {
    setKegData((prev) => {
      const map: Record<string, keyof DayKeg> = {
        opening_keg: 'opening',
        added_keg: 'added',
        buy_price_keg: 'buy_price',
        sell_price_keg: 'sell_price',
      };
      const key = map[field];
      if (!key) return prev;
      const updated = { ...prev, [key]: value };
      localStorage.setItem(`draft_stock_keg_${date}`, JSON.stringify(updated));
      return updated;
    });
  }, [date]);

  const handleProductDataChange = useCallback((data: Record<string, any>) => {
    setProductData(data);
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const productsList: DayProduct[] = Object.values(productData).map((p) => ({
        date,
        product_id: p.product_id,
        opening: p.opening ?? 0,
        added: p.added ?? 0,
        left_count: p.left_count ?? null,
        buy_price: p.buy_price ?? 0,
        sell_price: p.sell_price ?? 0,
      }));

      const safeKeg: DayKeg = {
        opening: kegData.opening ?? 0,
        added: kegData.added ?? 0,
        closing: kegData.closing ?? null,
        buy_price: kegData.buy_price ?? 0,
        sell_price: kegData.sell_price ?? 0,
        total_money: kegData.total_money ?? null,
        overflow: kegData.overflow ?? 0,
        expenses: kegData.expenses ?? 0,
        date: kegData.date || date,
      };

      await apiService.saveStock(date, productsList, safeKeg);
      
      // Clear drafts on successful save
      localStorage.removeItem(`draft_stock_products_${date}`);
      localStorage.removeItem(`draft_stock_keg_${date}`);

      router.push(`/?date=${date}`);
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save stock. Please try again.');
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
        <p className="text-sm text-primary/40 mb-6">Add products in the catalog first, then return here to enter stock.</p>
        <button onClick={() => router.push('/products')} className="btn-primary py-3 px-6">
          Manage Products
        </button>
      </div>
    );
  }

  const stepLabels = [...groupNames, 'Kegs'];

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
          {/* Category Chips Navigation */}
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

          {!isKegStep ? (
            <ProductGroupStep
              date={date}
              groupName={groupNames[currentStep]}
              products={productsByGroup[groupNames[currentStep]] ?? []}
              entries={productData}
              onUpdate={handleProductUpdate}
            />
          ) : (
            <KegStockStep
              opening={kegData.opening}
              added={kegData.added}
              buyPrice={kegData.buy_price}
              sellPrice={kegData.sell_price}
              onUpdate={handleKegUpdate}
            />
          )}

          <div className="flex justify-between gap-3 pt-4">
            <button onClick={handlePrev} disabled={currentStep === 0} className="btn-outline flex-1">
              Previous
            </button>
            {isLastStep ? (
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save Stock'}
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary flex-1">
                Next
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <UnifiedStockView
            date={date}
            products={Object.values(productData)}
            initialProductData={productData}
            onProductDataChange={handleProductDataChange}
            kegData={kegData}
            onKegUpdate={handleKegUpdate}
            onSaveAll={handleSave}
            saving={saving}
          />
        </>
      )}
    </div>
  );
}

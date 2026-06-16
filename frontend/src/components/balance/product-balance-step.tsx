'use client';
import { useState } from 'react';
import type { Product, DayProduct } from '@/types/db';
import { EditableNumber } from '../ui/editable-number';
import { apiService } from '@/lib/api-service';

interface Props {
  date: string;
  groupName: string;
  products: Product[];
  dayProducts: Record<string, DayProduct | undefined>;
  leftCounts: Record<string, number | null>;
  onLeftChange: (productId: string, value: number) => void;
}

const formatValue = (val: number): string => {
  if (val === 0.5) return '1/2';
  if (val % 1 === 0.5) return `${Math.floor(val)} 1/2`;
  return String(val);
};

export function ProductBalanceStep({ date, groupName, products, dayProducts, leftCounts, onLeftChange }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (productId: string) => {
    const dp = dayProducts[productId];
    const leftCount = leftCounts[productId];
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
      alert('Failed to save balance. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="wizard-step">
      <h3 className="text-lg font-bold text-primary">{groupName}</h3>
      <div className="space-y-3">
        {products.map((product) => {
          const dayProd = dayProducts[product.id];
          const opening = dayProd?.opening ?? 0;
          const added = dayProd?.added ?? 0;
          const total = opening + added;
          const leftRaw = leftCounts[product.id];
          const left = leftRaw ?? 0;
          const isSet = leftRaw != null;
          const sold = isSet ? total - left : 0;
          const sellPrice = dayProd?.sell_price ?? product.sell_price;
          const isOversold = sold < 0;
          const isSaving = savingId === product.id;

          return (
            <div key={product.id} className={`card border ${isOversold ? 'border-danger/30 bg-danger/5' : 'border-primary/10'}`}>
              <div className="flex items-start justify-between mb-3">
                <p className="font-semibold text-primary">{product.name}</p>
                <button
                  onClick={() => handleSave(product.id)}
                  disabled={!isSet || isSaving || isOversold}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-primary/60">Opening</label>
                  <div className="input-readonly">{opening}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-primary/60">Added</label>
                  <div className="input-readonly">{added}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-primary/60">Total</label>
                  <div className="input-readonly">{total}</div>
                </div>
                <EditableNumber
                  label="Balance"
                  value={left}
                  onChange={(v) => onLeftChange(product.id, v)}
                  highlight
                  hasError={isOversold}
                  allowDecimals
                  readOnly={total === 0}
                  hint={total === 0 ? 'Out of stock' : !isSet ? 'Enter balance' : undefined}
                />
              </div>
              {isSet && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className={isOversold ? 'text-danger font-semibold' : 'text-primary/60'}>
                    Sold: <strong>{sold >= 0 ? formatValue(sold) : `${formatValue(sold)} (oversold — max available: ${total})`}</strong>
                  </span>
                  <span className="text-primary/60">
                    Money: <strong>KSh {(Math.max(0, sold) * sellPrice).toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

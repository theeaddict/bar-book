'use client';
import { useState } from 'react';
import type { Product, StockEntry } from '@/types/db';
import { EditableNumber } from '../ui/editable-number';
import { EditablePrice } from '../ui/editable-price';
import { apiService } from '@/lib/api-service';

interface Props {
  date: string;
  groupName: string;
  products: Product[];
  entries: Record<string, StockEntry & { name: string; group_name: string }>;
  onUpdate: (productId: string, field: keyof StockEntry, value: number) => void;
}

export function ProductGroupStep({ date, groupName, products, entries, onUpdate }: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (productId: string) => {
    const entry = entries[productId];
    if (!entry) return;
    setSavingId(productId);
    try {
      await apiService.saveSingleProductStock(date, {
        product_id: productId,
        opening: entry.opening ?? 0,
        added: entry.added ?? 0,
        buy_price: entry.buy_price ?? 0,
        sell_price: entry.sell_price ?? 0,
      });
    } catch (err) {
      console.error('Failed to save stock:', err);
      alert('Failed to save stock. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="wizard-step">
      <h3 className="text-lg font-bold text-primary">{groupName}</h3>
      <div className="space-y-3">
        {products.map((product) => {
          const entry = entries[product.id];
          if (!entry) return null;
          const total = Number(entry.opening || 0) + Number(entry.added || 0);
          const isSaving = savingId === product.id;

          return (
            <div key={product.id} className="card border border-accent/20">
              <div className="flex items-start justify-between mb-3">
                <p className="font-semibold text-primary">{product.name}</p>
                <button
                  onClick={() => handleSave(product.id)}
                  disabled={isSaving}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <EditableNumber
                  label="Opening"
                  value={entry.opening}
                  onChange={() => {}}
                  readOnly
                />
                <EditableNumber
                  label="Added"
                  value={entry.added}
                  onChange={(v) => onUpdate(product.id, 'added', v)}
                  highlight
                />
                <EditablePrice
                  label="Buy Price"
                  value={entry.buy_price}
                  onChange={(v) => onUpdate(product.id, 'buy_price', v)}
                />
                <EditablePrice
                  label="Sell Price"
                  value={entry.sell_price}
                  onChange={(v) => onUpdate(product.id, 'sell_price', v)}
                />
              </div>
              <div className="mt-2 text-right">
                <span className="text-sm text-primary/60">
                  Total: <strong className="text-primary">{total}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

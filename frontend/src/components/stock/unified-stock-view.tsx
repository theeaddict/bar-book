'use client';
import { useState } from 'react';
import type { DayKeg, StockEntry } from '@/types/db';
import { EditableNumber } from '../ui/editable-number';
import { EditablePrice } from '../ui/editable-price';
import { KegStockStep } from './keg-stock-step';
import { apiService } from '@/lib/api-service';

interface Props {
  date: string;
  products: (StockEntry & { name: string; group_name: string; product_id: string })[];
  initialProductData: Record<string, StockEntry & { name: string; group_name: string }>;
  onProductDataChange: (data: Record<string, any>) => void;
  kegData: DayKeg;
  onKegUpdate: (field: string, value: number) => void;
  onSaveAll: () => void;
  saving: boolean;
}

export function UnifiedStockView({ date, products, initialProductData, onProductDataChange, kegData, onKegUpdate, onSaveAll, saving }: Props) {
  const [productData, setProductData] = useState(initialProductData);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleUpdate = (productId: string, field: string, value: number) => {
    const updated = { ...productData, [productId]: { ...productData[productId], [field]: value } };
    setProductData(updated);
    onProductDataChange(updated);
  };

  const handleSave = async (productId: string) => {
    const entry = productData[productId];
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
      alert('Failed to save stock.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      {/* ───── Products Section ───── */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">Products</h3>
        <div className="space-y-3">
          {products.map((p) => {
            const entry = productData[p.product_id];
            if (!entry) return null;
            const total = Number(entry.opening || 0) + Number(entry.added || 0);
            const isSaving = savingId === p.product_id;

            return (
              <div key={p.product_id} className="card border border-accent/20">
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-primary">{p.name || p.product_id}</p>
                  <button
                    onClick={() => handleSave(p.product_id)}
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
                    onChange={(v) => handleUpdate(p.product_id, 'added', v)}
                    highlight
                  />
                  <EditablePrice
                    label="Buy Price"
                    value={entry.buy_price}
                    onChange={(v) => handleUpdate(p.product_id, 'buy_price', v)}
                  />
                  <EditablePrice
                    label="Sell Price"
                    value={entry.sell_price}
                    onChange={(v) => handleUpdate(p.product_id, 'sell_price', v)}
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

      {/* ───── Keg Section ───── */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">Kegs</h3>
        <KegStockStep
          opening={kegData.opening}
          added={kegData.added}
          buyPrice={kegData.buy_price}
          sellPrice={kegData.sell_price}
          onUpdate={onKegUpdate}
        />
      </div>

      {/* ───── Save All ───── */}
      <button
        onClick={onSaveAll}
        disabled={saving}
        className="btn-primary w-full disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save All'}
      </button>
    </div>
  );
}

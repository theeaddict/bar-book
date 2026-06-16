'use client';
import type { DayProduct, DayKeg } from '@/types/db';
import { EditableNumber } from '../ui/editable-number';
import { EditablePrice } from '../ui/editable-price';
import { FinalStep } from './final-step';

interface Props {
  date: string;
  products: DayProduct[];
  leftCounts: Record<string, number | null>;
  onLeftChange: (productId: string, value: number) => void;
  onSave: (productId: string) => void;
  savingId: string | null;
  kegData: DayKeg;
  hasKegStock: boolean;
  bottledSales: number;
  onKegUpdate: (field: string, value: number) => void;
  onTotalMoneyChange: (value: number) => void;
  onExpensesChange?: (value: number) => void;
  onCloseDay: () => void;
  saving: boolean;
  hasErrors: boolean;
}

const formatValue = (val: number): string => {
  if (val === 0.5) return '1/2';
  if (val % 1 === 0.5) return `${Math.floor(val)} 1/2`;
  return String(val);
};

export function UnifiedBalanceView({
  products, leftCounts, onLeftChange, onSave, savingId,
  kegData, hasKegStock, bottledSales, onKegUpdate, onTotalMoneyChange,
  onExpensesChange,
  onCloseDay, saving, hasErrors,
}: Props) {
  const kegsFinished = hasKegStock ? (kegData.opening + kegData.added) - (kegData.closing ?? 0) : 0;
  const expectedKegMoney = hasKegStock ? kegsFinished * kegData.sell_price : 0;

  return (
    <div className="flex flex-col gap-0">
      {/* ───── Products Section ───── */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">Products</h3>
        <div className="space-y-3">
          {products.map((p) => {
            const totalStock = Number(p.opening || 0) + Number(p.added || 0);
            const leftRaw = leftCounts[p.product_id];
            const left = leftRaw ?? 0;
            const isSet = leftRaw != null;
            const sold = isSet ? totalStock - left : 0;
            const isOversold = sold < 0;
            const isSaving = savingId === p.product_id;

            return (
              <div key={p.product_id} className={`card border ${isOversold ? 'border-danger/30 bg-danger/5' : 'border-primary/10'}`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-primary">{p.name || p.product_id}</p>
                  <button
                    onClick={() => onSave(p.product_id)}
                    disabled={!isSet || isSaving || isOversold}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-primary/60">Opening</label>
                    <div className="input-readonly">{p.opening ?? 0}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-primary/60">Added</label>
                    <div className="input-readonly">{p.added ?? 0}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-primary/60">Total</label>
                    <div className="input-readonly">{totalStock}</div>
                  </div>
                  <EditableNumber
                    label="Balance"
                    value={left}
                    onChange={(v) => onLeftChange(p.product_id, v)}
                    highlight
                    hasError={isOversold}
                    allowDecimals
                    readOnly={totalStock === 0}
                    hint={totalStock === 0 ? 'Out of stock' : !isSet ? 'Enter balance' : undefined}
                  />
                </div>
                {isSet && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className={isOversold ? 'text-danger font-semibold' : 'text-primary/60'}>
                      Sold: <strong>{sold >= 0 ? formatValue(sold) : `${formatValue(sold)}`}</strong>
                    </span>
                    <span className="text-primary/60">
                      Money: <strong>KSh {(Math.max(0, sold) * Number(p.sell_price || 0)).toLocaleString()}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── Keg Section ───── */}
      {hasKegStock && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-primary mb-4">Kegs</h3>
          <div className="card border border-teal/30 bg-teal/5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/60">Opening Kegs</label>
                <div className="input-readonly">{kegData.opening}</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/60">Added Kegs</label>
                <div className="input-readonly">{kegData.added}</div>
              </div>
              <EditableNumber
                label="Balance"
                value={kegData.closing ?? 0}
                onChange={(v) => onKegUpdate('closing', v)}
                highlight
                hint={kegData.closing === null ? 'Enter balance' : undefined}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/60">Buy Price / Keg</label>
                <div className="input-readonly">KSh {kegData.buy_price.toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-primary/60">Sell Price / Keg</label>
                <div className="input-readonly">KSh {kegData.sell_price.toLocaleString()}</div>
              </div>
            </div>
            {kegsFinished >= 0 && (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary/60">Kegs Finished:</span>
                  <strong className="text-primary">{kegsFinished}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Expected Keg Sales:</span>
                  <strong className="text-primary">KSh {expectedKegMoney.toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── Final Section ───── */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">Close Day</h3>
        <FinalStep
          kegData={kegData}
          bottledSales={bottledSales}
          onTotalMoneyChange={onTotalMoneyChange}
          onExpensesChange={onExpensesChange}
        />
        <button
          onClick={onCloseDay}
          disabled={saving || hasErrors || kegData.total_money == null || kegData.total_money <= 0}
          className="btn-primary w-full mt-4 disabled:opacity-50"
        >
          {saving ? 'Closing...' : 'Close Day'}
        </button>
      </div>
    </div>
  );
}

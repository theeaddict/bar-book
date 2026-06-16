'use client';
import { EditableNumber } from '../ui/editable-number';
import { EditablePrice } from '../ui/editable-price';

interface Props {
  opening: number;
  added: number;
  closing: number;
  buyPrice: number;
  sellPrice: number;
  onUpdate: (field: string, value: number) => void;
}

export function KegBalanceStep({ opening, added, closing, buyPrice, sellPrice, onUpdate }: Props) {
  const kegsFinished = (opening + added) - closing;
  const expectedMoney = kegsFinished * sellPrice;

  return (
    <div className="wizard-step">
      <h3 className="text-lg font-bold text-primary">Keg Balance</h3>
      <p className="text-sm text-primary/60 mb-2">Enter the closing count for kegs.</p>

      <div className="card border border-teal/30 bg-teal/5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-primary/60">Opening Kegs</label>
            <div className="input-readonly">{opening}</div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-primary/60">Added Kegs</label>
            <div className="input-readonly">{added}</div>
          </div>
          <EditableNumber
            label="Closing Kegs"
            value={closing}
            onChange={(v) => onUpdate('closing', v)}
            highlight
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-primary/60">Buy Price / Keg</label>
            <div className="input-readonly">KSh {buyPrice.toLocaleString()}</div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-primary/60">Sell Price / Keg</label>
            <div className="input-readonly">KSh {sellPrice.toLocaleString()}</div>
          </div>
        </div>

        {kegsFinished >= 0 && (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-primary/60">Kegs Fully Finished Today:</span>
              <strong className="text-primary">{kegsFinished}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-primary/60">Expected Keg Sales:</span>
              <strong className="text-primary">KSh {expectedMoney.toLocaleString()}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { EditableNumber } from '../ui/editable-number';
import { EditablePrice } from '../ui/editable-price';

interface Props {
  opening: number;
  added: number;
  buyPrice: number;
  sellPrice: number;
  onUpdate: (field: 'opening_keg' | 'added_keg' | 'buy_price_keg' | 'sell_price_keg', value: number) => void;
}

export function KegStockStep({ opening, added, buyPrice, sellPrice, onUpdate }: Props) {
  const totalKegs = Number(opening || 0) + Number(added || 0);

  return (
    <div className="wizard-step">
      <h3 className="text-lg font-bold text-primary">Kegs (Draft Line)</h3>
      <p className="text-sm text-primary/60 mb-2">Single active keg model — only one keg is poured at a time.</p>

      <div className="card border border-teal/30 bg-teal/5">
        <div className="grid grid-cols-2 gap-3">
          <EditableNumber
            label="Opening Kegs"
            value={opening}
            onChange={(v) => onUpdate('opening_keg', v)}
            readOnly
            hint="Start of day"
          />
          <EditableNumber
            label="Added Kegs"
            value={added}
            onChange={(v) => onUpdate('added_keg', v)}
            highlight
          />
          <EditablePrice
            label="Buy Price per Keg"
            value={buyPrice}
            onChange={(v) => onUpdate('buy_price_keg', v)}
          />
          <EditablePrice
            label="Sell Price per Keg"
            value={sellPrice}
            onChange={(v) => onUpdate('sell_price_keg', v)}
          />
        </div>
        <div className="mt-3 text-right">
          <span className="text-sm text-primary/60">
            Total Kegs: <strong className="text-primary">{totalKegs}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

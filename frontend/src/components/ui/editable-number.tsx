'use client';
import { useState, useEffect } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (val: number) => void;
  readOnly?: boolean;
  highlight?: boolean;
  hint?: string;
  hasError?: boolean;
  allowDecimals?: boolean;
}

function parseFractionOrFloat(valStr: string): number {
  const trimmed = valStr.trim();
  if (!trimmed) return 0;
  
  if (trimmed === '1/2' || trimmed === '.5') return 0.5;
  
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }
  
  return parseFloat(trimmed) || 0;
}

export function EditableNumber({ label, value, onChange, readOnly = false, highlight, hint, hasError, allowDecimals = false }: Props) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value === 0) {
      setDisplay('');
    } else if (value === 0.5) {
      setDisplay('1/2');
    } else {
      setDisplay(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = allowDecimals
      ? e.target.value.replace(/[^0-9./]/g, '')
      : e.target.value.replace(/[^0-9]/g, '');

    setDisplay(raw);

    if (raw === '' || raw === '.' || raw === '/') {
      onChange(0);
    } else {
      onChange(allowDecimals ? parseFractionOrFloat(raw) : parseInt(raw, 10) || 0);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-primary/60">{label}</label>
        {hint && <span className="text-xs text-primary/40">{hint}</span>}
      </div>
      {readOnly ? (
        <div className="input-readonly">
          {value === 0.5 ? '1/2' : value.toLocaleString()}
        </div>
      ) : (
        <input
          type="text"
          inputMode={allowDecimals ? 'decimal' : 'numeric'}
          value={display}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className={`input-field ${
            hasError
              ? 'border-danger ring-2 ring-danger/30 text-danger'
              : highlight
              ? 'border-accent ring-2 ring-accent/30'
              : ''
          }`}
        />
      )}
    </div>
  );
}

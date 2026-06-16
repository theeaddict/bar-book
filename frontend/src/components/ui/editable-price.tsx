'use client';
import { useState, useEffect } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (val: number) => void;
  readOnly?: boolean;
  prefix?: string;
}

export function EditablePrice({ label, value, onChange, readOnly = false, prefix = 'KSh' }: Props) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    setDisplay(value === 0 ? '' : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplay(raw);
    onChange(parseInt(raw, 10) || 0);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-primary/60">{label}</label>
      <div className="relative">
        {readOnly ? (
          <div className="input-readonly flex items-center gap-1">
            <span className="text-xs">{prefix}</span>
            <span>{value.toLocaleString()}</span>
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-primary/40">{prefix}</span>
            <input
              type="text"
              inputMode="numeric"
              value={display}
              onChange={handleChange}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="input-field pl-12"
            />
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useState, useMemo } from 'react';
import { EditableNumber } from '../ui/editable-number';
import { computeKegReconciliation } from '@/lib/keg-calculations';
import type { DayKeg } from '@/types/db';

interface Props {
  kegData: DayKeg;
  bottledSales: number;
  onTotalMoneyChange: (value: number) => void;
  onExpensesChange?: (value: number) => void;
}

export function FinalStep({ kegData, bottledSales, onTotalMoneyChange, onExpensesChange }: Props) {
  const [totalMoney, setTotalMoney] = useState(kegData.total_money ?? 0);
  const [expenses, setExpenses] = useState(kegData.expenses ?? 0);

  const result = useMemo(() => {
    if (totalMoney <= 0) return null;
    const keg: DayKeg = { ...kegData, total_money: totalMoney };
    try {
      return computeKegReconciliation(keg, bottledSales, expenses);
    } catch {
      return null;
    }
  }, [kegData, bottledSales, totalMoney, expenses]);

  const handleMoneyChange = (v: number) => {
    setTotalMoney(v);
    onTotalMoneyChange(v);
  };

  const handleExpensesChange = (v: number) => {
    setExpenses(v);
    if (onExpensesChange) onExpensesChange(v);
  };

  return (
    <div className="wizard-step">
      <h3 className="text-lg font-bold text-primary">Close Day</h3>
      <p className="text-sm text-primary/60 mb-2">Enter the gross money collected and any expenses.</p>

      <div className="card border border-accent/30 space-y-4">
        <EditableNumber
          label="Total Money Collected (Gross Cash + M-Pesa)"
          value={totalMoney}
          onChange={handleMoneyChange}
          highlight
        />
        <EditableNumber
          label="Expenses (Money spent from today's sales)"
          value={expenses}
          onChange={handleExpensesChange}
        />
        
        {totalMoney > 0 && (
          <div className="pt-3 border-t border-primary/10 flex flex-col gap-1">
            <span className="font-semibold text-primary text-sm">Net Handover <span className="font-normal opacity-80">(Cash + M-Pesa you are physically handing over)</span>:</span>
            <span className="text-xl font-bold text-success">KSh {(totalMoney - expenses).toLocaleString()}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="card border border-primary/10 space-y-2 mt-4">
          <h4 className="font-semibold text-primary">Day Reconciliation</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-primary/60">Expected Bottled Sales:</span>
            <span className="text-right font-medium">KSh {bottledSales.toLocaleString()}</span>
            <span className="text-primary/60">Expected Keg Sales ({result.kegsFinished} finished):</span>
            <span className="text-right font-medium">KSh {result.expectedKegMoney.toLocaleString()}</span>
            
            <span className="text-primary font-semibold border-t border-primary/10 pt-2">Total Expected Sales:</span>
            <span className="text-right font-semibold border-t border-primary/10 pt-2">
              KSh {(bottledSales + result.expectedKegMoney).toLocaleString()}
            </span>

            <span className="text-primary/60 mt-2">Total Money Collected:</span>
            <span className="text-right font-medium mt-2">KSh {totalMoney.toLocaleString()}</span>

            <span className="text-primary/60">Less Expenses:</span>
            <span className="text-right font-medium text-danger">-KSh {expenses.toLocaleString()}</span>

            <span className="text-primary font-semibold border-t border-primary/10 pt-1">Net Handover:</span>
            <span className="text-right font-semibold border-t border-primary/10 pt-1">
              KSh {(totalMoney - expenses).toLocaleString()}
            </span>
            
            <span className={`text-sm font-bold ${result.diff < 0 ? 'text-danger' : result.diff > 0 ? 'text-success' : ''} pt-2`}>
              Balance (Diff):
            </span>
            <span className={`text-right font-bold ${result.diff < 0 ? 'text-danger' : result.diff > 0 ? 'text-success' : ''} pt-2`}>
              {result.diff > 0 ? '+' : ''}KSh {result.diff.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

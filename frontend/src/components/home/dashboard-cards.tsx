'use client';
import type { DaySummary } from '@/types/db';

interface Props {
  summary: DaySummary | null;
  loading: boolean;
}

export function DashboardCards({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="card animate-pulse h-24 bg-primary/5" />
          <div className="card animate-pulse h-24 bg-primary/5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card animate-pulse h-20 bg-primary/5" />
          <div className="card animate-pulse h-20 bg-primary/5" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card animate-pulse h-24 bg-primary/5" />
          <div className="card animate-pulse h-24 bg-primary/5" />
          <div className="card animate-pulse h-24 bg-primary/5" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card text-center py-8">
        <p className="text-primary/40">Select a date to view summary</p>
      </div>
    );
  }

  const hasData = summary.has_products || summary.has_keg;

  if (!hasData) {
    return (
      <div className="card text-center py-8">
        <p className="text-primary/40">No data for this day</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* LINE 1: Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-primary/10 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide mb-1">Gross Collected</p>
          <p className="text-2xl font-black text-primary">KSh {summary.total_collected.toLocaleString()}</p>
        </div>
        
        <div className="bg-white border border-primary/10 rounded-xl p-4 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-semibold text-primary/60 uppercase tracking-wide mb-1">Total Sales</p>
          <p className="text-2xl font-black text-primary">KSh {summary.total_sales.toLocaleString()}</p>
        </div>
      </div>

      {/* LINE 2: Category Sales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-primary/10 rounded-xl p-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
            </svg>
            <p className="text-xs font-semibold text-primary/60 uppercase">Bottled Sales</p>
          </div>
          <p className="text-lg font-bold text-primary">{summary.bottled_sales.toLocaleString()}</p>
        </div>
        
        <div className="bg-white border border-primary/10 rounded-xl p-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <p className="text-xs font-semibold text-primary/60 uppercase">Keg Sales</p>
          </div>
          <p className="text-lg font-bold text-primary">{summary.keg_sales.toLocaleString()}</p>
        </div>
      </div>

      {/* LINE 3: Profit */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center flex flex-col justify-center">
          <p className="text-xs font-bold text-success/80 uppercase mb-1">Gross Profit</p>
          <p className="text-lg font-black text-success">{summary.total_profit.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-primary/10 rounded-xl p-3 text-center flex flex-col justify-center">
          <p className="text-xs font-bold text-primary/60 uppercase mb-1">Bottled Profit</p>
          <p className="text-base font-bold text-primary">{summary.bottled_profit.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-primary/10 rounded-xl p-3 text-center flex flex-col justify-center">
          <p className="text-xs font-bold text-primary/60 uppercase mb-1">Keg Profit</p>
          <p className="text-base font-bold text-primary">{summary.keg_profit.toLocaleString()}</p>
        </div>
      </div>

      {/* LINE 4: Balance & Extras */}
      <div className="grid grid-cols-2 gap-3">
        {summary.has_keg && (
          <div className="bg-white border border-primary/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-xs font-semibold text-primary/60 uppercase">Kegs Finished</span>
            <span className="text-lg font-black text-primary">{summary.kegs_finished}</span>
          </div>
        )}
        {summary.expenses > 0 && (
          <div className="bg-danger/5 border border-danger/10 rounded-xl p-4 flex justify-between items-center">
            <span className="text-xs font-semibold text-danger/70 uppercase">Expenses</span>
            <span className="text-lg font-bold text-danger">KSh {summary.expenses.toLocaleString()}</span>
          </div>
        )}
        
        <div className={`col-span-2 rounded-xl p-5 flex justify-between items-center border ${
          summary.keg_diff < 0 
            ? 'bg-danger/10 border-danger/20 text-danger' 
            : summary.keg_diff > 0 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-primary/5 border-primary/10 text-primary'
        }`}>
          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Final Balance</span>
          </div>
          <span className="text-2xl font-black">
            {summary.keg_diff > 0 ? '+' : ''}KSh {summary.keg_diff.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';
import type { DaySummary } from '@/types/db';
import { format, parseISO } from 'date-fns';

interface Props {
  date: string;
}

export function MonthTab({ date }: Props) {
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService.getMonthReport(date)
      .then((data) => {
        setSummaries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load monthly report:', err);
        setLoading(false);
      });
  }, [date]);

  if (loading) {
    return <div className="py-10 text-center text-primary/40">Loading...</div>;
  }

  const daysWithData = summaries.filter((s) => s.has_products || s.has_keg);
  const totals = summaries.reduce(
    (acc, s) => ({
      sales: acc.sales + s.total_sales,
      profit: acc.profit + s.total_profit,
      bottled: acc.bottled + s.bottled_sales,
      keg: acc.keg + s.keg_sales,
      collected: acc.collected + s.total_collected,
    }),
    { sales: 0, profit: 0, bottled: 0, keg: 0, collected: 0 },
  );

  if (daysWithData.length === 0) {
    return <div className="py-10 text-center text-primary/40">No data for this month</div>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-primary/50 text-xs border-b border-primary/10">
              <th className="text-left py-2 pr-2">Date</th>
              <th className="text-right px-2">Sales</th>
              <th className="text-right px-2">Bottled</th>
              <th className="text-right px-2">Keg</th>
              <th className="text-right px-2">Collected</th>
              <th className="text-right pl-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const d = parseISO(s.date);
              const hasData = s.has_products || s.has_keg;
              return (
                <tr
                  key={s.date}
                  className={`border-b border-primary/5 ${!hasData ? 'opacity-30' : ''}`}
                >
                  <td className="py-2 pr-2 font-medium text-primary">{format(d, 'MMM d')}</td>
                  <td className="text-right px-2">
                    {hasData ? `KSh ${s.total_sales.toLocaleString()}` : '-'}
                  </td>
                  <td className="text-right px-2">
                    {hasData ? `KSh ${s.bottled_sales.toLocaleString()}` : '-'}
                  </td>
                  <td className="text-right px-2">
                    {hasData && s.has_keg ? `KSh ${s.keg_sales.toLocaleString()}` : '-'}
                  </td>
                  <td className="text-right px-2">
                    {hasData && s.total_collected > 0 ? `KSh ${s.total_collected.toLocaleString()}` : '-'}
                  </td>
                  <td className={`text-right pl-2 font-medium ${
                    hasData ? (s.total_profit >= 0 ? 'text-success' : 'text-danger') : ''
                  }`}>
                    {hasData ? `KSh ${s.total_profit.toLocaleString()}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card bg-primary text-cream rounded-2xl p-5 shadow-md">
        <h4 className="font-bold text-lg mb-3">Month Total</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-cream/60">Total Sales</span>
            <p className="font-bold text-xl text-white">KSh {totals.sales.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-cream/60">Total Profit</span>
            <p className="font-bold text-xl text-accent">KSh {totals.profit.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-cream/60">Bottled Sales</span>
            <p className="font-bold text-white">KSh {totals.bottled.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-cream/60">Keg Sales</span>
            <p className="font-bold text-white">KSh {totals.keg.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-cream/60">Total Collected</span>
            <p className="font-bold text-white">KSh {totals.collected.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-cream/60">Active Days</span>
            <p className="font-bold text-white">{daysWithData.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

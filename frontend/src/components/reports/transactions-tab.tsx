'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

interface Props {
  date: string;
}

interface TransactionItem {
  name: string;
  opening: number;
  added: number;
  total: number;
  left_count: number;
  sold: number;
  sell_price: number;
  revenue: number;
  profit: number;
}

export function TransactionsTab({ date }: Props) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService.getTransactions(date)
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load transactions:', err);
        setLoading(false);
      });
  }, [date]);

  if (loading) {
    return <div className="py-10 text-center text-primary/40">Loading...</div>;
  }

  if (transactions.length === 0) {
    return <div className="py-10 text-center text-primary/40">No transactions for this day</div>;
  }

  const grandTotalRevenue = transactions.reduce((acc, t) => acc + t.revenue, 0);
  const grandTotalProfit = transactions.reduce((acc, t) => acc + t.profit, 0);

  return (
    <div className="space-y-6">
      <div className="card border border-primary/10 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary/5 text-primary/70 text-xs uppercase font-bold border-b border-primary/10">
              <tr>
                <th className="text-left py-3 px-4">Product</th>
                <th className="text-right py-3 px-3">Opening</th>
                <th className="text-right py-3 px-3">Added</th>
                <th className="text-right py-3 px-3">Total</th>
                <th className="text-right py-3 px-3">Balance</th>
                <th className="text-right py-3 px-3">Sold</th>
                <th className="text-right py-3 px-3">Selling Price</th>
                <th className="text-right py-3 px-3">Total Amount</th>
                <th className="text-right py-3 px-4">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {transactions.map((t, idx) => (
                <tr key={idx} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="py-3 px-4 font-semibold text-primary">{t.name}</td>
                  <td className="py-3 px-3 text-right text-primary/80">{t.opening}</td>
                  <td className="py-3 px-3 text-right text-primary/80">{t.added}</td>
                  <td className="py-3 px-3 text-right font-medium text-primary">{t.total}</td>
                  <td className="py-3 px-3 text-right text-primary/80">{t.left_count}</td>
                  <td className="py-3 px-3 text-right font-bold text-primary">{t.sold}</td>
                  <td className="py-3 px-3 text-right text-primary/80">KSh {t.sell_price.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-semibold text-primary">KSh {t.revenue.toLocaleString()}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${t.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    KSh {t.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary card */}
      <div className="card bg-[#4A2E1B] text-white flex flex-col sm:flex-row justify-between gap-4 p-5 items-center rounded-2xl shadow-lg">
        <div>
          <h3 className="font-bold text-lg">Grand Daily Total</h3>
          <p className="text-xs opacity-75">Aggregated sales details for {date}</p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs opacity-75 font-medium">Revenue</p>
            <p className="text-xl font-bold">KSh {grandTotalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs opacity-75 font-medium">Gross Profit</p>
            <p className="text-xl font-bold text-accent">KSh {grandTotalProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

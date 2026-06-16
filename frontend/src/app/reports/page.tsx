'use client';
import { Suspense, useState } from 'react';
import { useCurrentDate } from '@/hooks/use-current-date';
import { DateNavigator } from '@/components/ui/date-navigator';
import { TransactionsTab } from '@/components/reports/transactions-tab';
import { WeekTab } from '@/components/reports/week-tab';
import { MonthTab } from '@/components/reports/month-tab';
import { AuditTab } from '@/components/reports/audit-tab';

type Tab = 'transactions' | 'week' | 'month' | 'audit';

import Link from 'next/link';

function ReportsContent() {
  const { date, goPrev, goNext, goToday, isToday } = useCurrentDate();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'transactions', label: 'Transactions' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/?date=${date}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-white text-sm font-bold text-primary hover:bg-primary hover:text-cream shadow-sm mb-2 transition-all active:scale-[0.98] self-start"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">Reports</h2>
      </div>

      <DateNavigator
        date={date}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        isToday={isToday}
      />

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-xl border border-primary/10 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-h-touch rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-cream shadow-sm'
                : 'text-primary/60 hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'transactions' && <TransactionsTab date={date} />}
      {activeTab === 'week' && <WeekTab date={date} />}
      {activeTab === 'month' && <MonthTab date={date} />}
      {activeTab === 'audit' && <AuditTab date={date} />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-primary/40">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

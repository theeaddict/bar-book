'use client';
import { Suspense, useState, useEffect } from 'react';
import { useCurrentDate } from '@/hooks/use-current-date';
import { BalanceWizard } from '@/components/balance/balance-wizard';
import { apiService } from '@/lib/api-service';

import Link from 'next/link';

function BalanceContent() {
  const { date } = useCurrentDate();
  const [previousDate, setPreviousDate] = useState('');
  const [isPreviousDayResolved, setIsPreviousDayResolved] = useState(true);
  const [skipReason, setSkipReason] = useState('');
  const [skipping, setSkipping] = useState(false);
  const [checking, setChecking] = useState(true);

  const [isHistorical, setIsHistorical] = useState(false);

  useEffect(() => {
    setChecking(true);
    apiService.getDailyState(date)
      .then((state) => {
        setIsPreviousDayResolved(state.isPreviousDayResolved ?? true);
        setPreviousDate(state.previousDate || '');
        setIsHistorical(state.isHistorical ?? false);
        setChecking(false);
      })
      .catch(() => {
        setIsPreviousDayResolved(true);
        setPreviousDate('');
        setIsHistorical(false);
        setChecking(false);
      });
  }, [date]);

  const handleSkipDay = async () => {
    if (!skipReason.trim()) {
      alert('Please provide a reason to skip the day.');
      return;
    }
    setSkipping(true);
    try {
      await apiService.skipDay(previousDate, skipReason.trim());
      alert('Day skipped successfully!');
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to skip day:', err);
      alert(err.message || 'Failed to skip day.');
    } finally {
      setSkipping(false);
    }
  };

  if (checking) {
    return <div className="py-20 text-center text-primary/40">Loading...</div>;
  }

  return (
    <div>
      <Link
        href={`/?date=${date}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-white text-sm font-bold text-primary hover:bg-primary hover:text-cream shadow-sm mb-6 transition-all active:scale-[0.98] self-start"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {!isPreviousDayResolved ? (
        <div className="card border border-danger/30 bg-white flex flex-col gap-4 p-6 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/10 text-danger mt-0.5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-primary">Previous Day Unresolved</h3>
              <p className="text-sm text-primary/70 mt-1">
                You cannot balance <strong className="text-primary">{date}</strong> because the previous day <strong className="text-danger">{previousDate}</strong> has not been closed/balanced.
              </p>
            </div>
          </div>
          <hr className="border-primary/10" />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary/80">
              If the bar was closed on {previousDate}, please enter a reason to skip it and proceed:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="e.g. Closed for public holiday, renovation..."
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                disabled={skipping}
              />
              <button
                onClick={handleSkipDay}
                disabled={skipping || !skipReason.trim()}
                className="btn-danger whitespace-nowrap"
              >
                {skipping ? 'Skipping...' : 'Skip Day'}
              </button>
            </div>
          </div>
        </div>
      ) : isHistorical ? (
        <div className="card border border-danger/30 bg-white flex flex-col gap-4 p-6 shadow-md text-center py-12">
          <div className="mx-auto p-4 rounded-full bg-danger/10 text-danger mb-2 w-16 h-16 flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-black text-2xl text-primary">Historical Day Locked</h3>
          <p className="text-primary/70">
            You are viewing a past date (<strong>{date}</strong>). You cannot modify or balance sales for a day that precedes your latest active day, as this would break the stock carry-forward cycle.
          </p>
          <div className="mt-4">
            <Link
              href={`/`}
              className="btn-primary inline-block py-3 px-8"
            >
              Go to Latest Day
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-bold text-primary mb-4">Balance — {date}</h2>
          <BalanceWizard date={date} />
        </>
      )}
    </div>
  );
}

export default function BalancePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-primary/40">Loading...</div>}>
      <BalanceContent />
    </Suspense>
  );
}

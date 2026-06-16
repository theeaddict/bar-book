'use client';
import { Suspense, useState, useEffect } from 'react';
import { useCurrentDate } from '@/hooks/use-current-date';
import { apiService } from '@/lib/api-service';
import type { DaySummary } from '@/types/db';
import { DateNavigator } from '@/components/ui/date-navigator';
import { DashboardCards } from '@/components/home/dashboard-cards';
import { MainActions } from '@/components/home/main-actions';
import Link from 'next/link';

function HomeContent() {
  const { date, goPrev, goNext, goToday, isToday } = useCurrentDate();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStock, setHasStock] = useState(false);
  const [isBalanced, setIsBalanced] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);
  const [isPreviousDayResolved, setIsPreviousDayResolved] = useState(true);
  const [previousDate, setPreviousDate] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [skipping, setSkipping] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(apiService.getUsername());
    setLoading(true);
    Promise.all([
      apiService.getDaySummary(date),
      apiService.getDailyState(date),
      apiService.getProducts(),
    ])
      .then(([s, state, productsList]) => {
        setSummary(s);
        const hs = (state.products && state.products.some(p => (p.opening || 0) > 0 || (p.added || 0) > 0)) ||
                   (state.keg && ((state.keg.opening || 0) > 0 || (state.keg.added || 0) > 0));
        const ib = state.keg?.closing !== null;
        setHasStock(!!hs);
        setIsBalanced(!!ib);
        setHasProducts(productsList.length > 0);
        setIsPreviousDayResolved(state.isPreviousDayResolved ?? true);
        setPreviousDate(state.previousDate || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load page data:', err);
        setSummary(null);
        setHasStock(false);
        setIsBalanced(false);
        setHasProducts(false);
        setIsPreviousDayResolved(true);
        setPreviousDate('');
        setLoading(false);
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {username && (
          <h1 className="text-sm font-black text-primary">
            Welcome, <span className="text-accent-dark">{username}</span>!
          </h1>
        )}
        {isBalanced && (
          <span className="text-[10px] bg-success/10 text-success font-semibold px-2 py-0.5 rounded-full">
            Day Closed
          </span>
        )}
      </div>
      
      <DateNavigator
        date={date}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        isToday={isToday}
      />

      <DashboardCards summary={summary} loading={loading} />

      {!isPreviousDayResolved ? (
        <div className="card border border-danger/30 bg-white flex flex-col gap-4 p-6 shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/10 text-danger mt-0.5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-primary">Previous Day Unresolved</h3>
              <p className="text-sm text-primary/70 mt-1">
                You cannot enter stock or sales for <strong className="text-primary">{date}</strong> because the previous day <strong className="text-danger">{previousDate}</strong> has not been closed/balanced.
              </p>
            </div>
          </div>
          
          <hr className="border-primary/10" />

          <Link
            href={`/?date=${previousDate}`}
            className="btn-primary text-center py-3 px-6"
          >
            Go to {previousDate}
          </Link>

          <hr className="border-primary/10" />
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-primary/80">
              If the bar was closed on {previousDate}, enter a reason to skip it (stock carries forward):
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="e.g. Closed for public holiday, renovation, staff retreat..."
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
      ) : (
        <MainActions date={date} hasStock={hasStock} isBalanced={isBalanced} hasProducts={hasProducts} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-primary/40">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

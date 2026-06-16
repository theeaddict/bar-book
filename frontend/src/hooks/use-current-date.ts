'use client';
import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

function todayStr(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function yesterdayStr(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

function tomorrowStr(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function useCurrentDate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const date = searchParams.get('date') || todayStr();

  const setDate = useCallback((newDate: string) => {
    router.push(`${pathname}?date=${newDate}`);
  }, [router, pathname]);

  const goPrev = useCallback(() => setDate(yesterdayStr(date)), [date, setDate]);
  const goNext = useCallback(() => setDate(tomorrowStr(date)), [date, setDate]);
  const goToday = useCallback(() => setDate(todayStr()), [setDate]);

  return {
    date,
    setDate,
    goPrev,
    goNext,
    goToday,
    yesterday: yesterdayStr(date),
    tomorrow: tomorrowStr(date),
    isToday: date === todayStr(),
  };
}

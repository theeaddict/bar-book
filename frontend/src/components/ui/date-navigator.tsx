'use client';
import { format, parseISO } from 'date-fns';

interface Props {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
}

export function DateNavigator({ date, onPrev, onNext, onToday, isToday }: Props) {
  const d = parseISO(date);
  const dateLabel = format(d, 'EEE, MMM d, yyyy');

  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-primary/10 p-2">
      <button
        onClick={onPrev}
        className="min-w-touch min-h-touch flex items-center justify-center rounded-lg hover:bg-primary/5 transition-colors text-primary"
        aria-label="Previous day"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="font-semibold text-primary text-sm sm:text-base">{dateLabel}</span>
        {!isToday && (
          <button
            onClick={onToday}
            className="text-xs text-accent font-semibold hover:underline min-h-touch px-2"
          >
            Today
          </button>
        )}
      </div>

      <button
        onClick={onNext}
        className="min-w-touch min-h-touch flex items-center justify-center rounded-lg hover:bg-primary/5 transition-colors text-primary"
        aria-label="Next day"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

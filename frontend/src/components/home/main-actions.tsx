'use client';
import Link from 'next/link';

interface Props {
  date: string;
  hasStock: boolean;
  isBalanced: boolean;
  hasProducts: boolean;
}

export function MainActions({ date, hasStock, isBalanced, hasProducts }: Props) {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="grid grid-cols-3 gap-2">
        <Link
          href={`/stock?date=${date}`}
          className={`btn-primary flex items-center justify-center gap-1.5 text-center py-2 px-1 ${
            isBalanced ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] sm:text-xs font-bold">Stock</span>
            {hasStock && <span className="text-[9px] text-accent font-normal">Done</span>}
          </div>
        </Link>

        <Link
          href={`/balance?date=${date}`}
          className={`btn-accent flex items-center justify-center gap-1.5 text-center py-2 px-1 ${
            !hasStock ? 'opacity-60 pointer-events-none' : ''
          } ${isBalanced ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] sm:text-xs font-bold">Balance</span>
            {isBalanced && <span className="text-[9px] text-green-700 font-normal">Closed</span>}
          </div>
        </Link>

        <Link
          href={`/reports?date=${date}`}
          className="btn-outline flex items-center justify-center gap-1.5 text-center py-2 px-1"
        >
          <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[11px] sm:text-xs font-bold">Reports</span>
        </Link>
      </div>

      {!hasProducts && (
        <Link href="/products" className="text-center text-xs text-accent font-semibold hover:underline">
          Add products first →
        </Link>
      )}
      {hasProducts && (
        <Link href="/products" className="text-center text-[10px] text-primary/40 hover:text-accent transition-colors">
          Manage Products
        </Link>
      )}
    </div>
  );
}

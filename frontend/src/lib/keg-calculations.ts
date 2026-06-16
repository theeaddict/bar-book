import type { DayKeg, KegAlert } from '@/types/db';

export interface KegResult {
  kegsFinished: number;
  expectedKegMoney: number;
  actualKegMoney: number;
  diff: number;
}

export function computeKegReconciliation(
  keg: DayKeg,
  bottledSales: number,
  expenses: number = 0,
): KegResult {
  const opening = keg.opening;
  const added = keg.added;
  const closing = keg.closing!;
  const sellPrice = keg.sell_price;
  
  // totalMoney is the Gross cash collected
  const grossCollected = keg.total_money!;
  const netHandover = grossCollected - expenses;
  const carriedOverflow = 0; 

  const kegsFinished = (opening + added) - closing;
  const expectedKegMoney = kegsFinished * sellPrice;
  
  // The owner expects the full stock value to be matched by the Gross Cash Collected.
  // So the difference is Gross Collected - Total Expected Sales.
  const actualKegMoney = grossCollected - bottledSales + carriedOverflow;
  const diff = actualKegMoney - expectedKegMoney;

  return {
    kegsFinished,
    expectedKegMoney,
    actualKegMoney,
    diff,
  };
}



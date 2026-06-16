// ─── Shared types for Dexie (local) and Supabase (remote) ───

export interface Product {
  id: string;
  group_name: string;
  name: string;
  buy_price: number;
  sell_price: number;
}

export interface DayProduct {
  id?: number;
  date: string;        // YYYY-MM-DD
  product_id: string;
  name?: string;
  group_name?: string;
  opening: number;
  added: number;
  left_count: number | null;  // null = not balanced yet
  buy_price: number | null;
  sell_price: number | null;
}

export interface DayKeg {
  id?: number;
  date: string;        // YYYY-MM-DD (unique)
  opening: number;
  added: number;
  closing: number | null;     // null = not balanced yet
  buy_price: number;
  sell_price: number;
  total_money: number | null; // null = not closed yet
  overflow: number;
  expenses?: number;
}

export interface KegAlert {
  id?: number;
  date: string;        // YYYY-MM-DD (unique)
  expected_keg_money: number;
  actual_keg_money: number;
  diff: number;
  resolved: boolean;
  notes?: string;
}

// ─── Derived / UI types ───

export interface DaySummary {
  date: string;
  bottled_sales: number;
  bottled_profit: number;
  bottled_cost: number;
  keg_sales: number;
  keg_profit: number;
  keg_cost: number;
  kegs_finished: number;
  expected_keg_money: number;
  actual_keg_money: number;
  keg_diff: number;
  carried_overflow: number;
  expenses: number;
  total_collected: number;
  total_sales: number;
  total_profit: number;
  has_keg: boolean;
  has_products: boolean;
}

export type ProductGroupMap = Record<string, Product[]>;

export interface StockEntry {
  product_id: string;
  opening: number;
  added: number;
  buy_price: number;
  sell_price: number;
}



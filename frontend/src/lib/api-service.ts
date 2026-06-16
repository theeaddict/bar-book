// src/lib/api-service.ts
import { Product, DayProduct, DayKeg, DaySummary } from '../types/db';

const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '5000';
const DEFAULT_TENANT_ID = 'd3b07384-d113-4956-a5cc-9c60dfd69453';

function getBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) return `${envUrl}/api`;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:${BACKEND_PORT}/api`;
    }
    return `http://${host}:${BACKEND_PORT}/api`;
  }
  return `http://localhost:${BACKEND_PORT}/api`;
}

function getTenantId(): string | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tenant_id');
    if (saved) return saved;
  }
  return null;
}

function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

function getRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('role');
  }
  return null;
}

function getUsername(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('username');
  }
  return null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Fallback if no token (for existing logic)
    const tenantId = getTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
  }

  const res = await fetch(`${getBackendUrl()}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const apiService = {
  getTenantId,
  getAuthToken,
  getRole,
  getUsername,
  
  async getPublicBarName(): Promise<string | null> {
    try {
      const res = await fetch(`${getBackendUrl()}/auth/bar-name`);
      if (res.ok) {
        const data = await res.json();
        return data.barName;
      }
    } catch (e) {}
    return null;
  },
  
  // Auth
  async login(credentials: any): Promise<{ token: string; tenantId: string; username: string; role: string }> {
    const res = await fetch(`${getBackendUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to login');
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('tenant_id', data.tenantId);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
    }
    return data;
  },
  async createUser(data: { username: string; password: string; role?: string }): Promise<void> {
    await request<void>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async getUsers(): Promise<any[]> {
    return request<any[]>('/auth/users');
  },
  async updateUser(id: string, data: { password?: string; role?: string }): Promise<void> {
    await request<void>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // Settings
  async getSettings(): Promise<Record<string, string>> {
    return request<Record<string, string>>('/settings');
  },
  async updateSetting(key: string, value: string): Promise<void> {
    await request<void>('/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  },
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
  },
  
  // Products Catalog
  async getProducts(): Promise<Product[]> {
    return request<Product[]>('/products');
  },
  async createProduct(product: Product): Promise<void> {
    await request<void>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },
  async updateProduct(id: string, product: Omit<Product, 'id'>): Promise<void> {
    await request<void>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },
  async deleteProduct(id: string): Promise<void> {
    await request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Daily State
  async getDailyState(date: string): Promise<{ products: DayProduct[]; keg: DayKeg; isPreviousDayResolved: boolean; isHistorical: boolean; previousDate: string }> {
    return request<{ products: DayProduct[]; keg: DayKeg; isPreviousDayResolved: boolean; isHistorical: boolean; previousDate: string }>(`/daily/state?date=${date}`);
  },
  async skipDay(date: string, reason: string): Promise<void> {
    await request<void>('/daily/skip', {
      method: 'POST',
      body: JSON.stringify({ date, reason }),
    });
  },
  async saveStock(date: string, products: DayProduct[], keg: DayKeg): Promise<void> {
    await request<void>('/daily/stock', {
      method: 'POST',
      body: JSON.stringify({ date, products, keg }),
    });
  },
  async closeDay(date: string, products: DayProduct[], keg: DayKeg, totalCollected: number): Promise<void> {
    await request<void>('/daily/balance', {
      method: 'POST',
      body: JSON.stringify({ date, products, keg, totalCollected }),
    });
  },

  // Single product/keg saves
  async saveSingleProductStock(date: string, product: { product_id: string; opening: number; added: number; buy_price: number; sell_price: number }): Promise<void> {
    await request<void>('/daily/stock/product', {
      method: 'POST',
      body: JSON.stringify({ date, ...product }),
    });
  },
  async saveSingleProductBalance(date: string, product: { product_id: string; left_count: number | null; opening?: number; added?: number; buy_price: number; sell_price: number }): Promise<void> {
    await request<void>('/daily/balance/product', {
      method: 'POST',
      body: JSON.stringify({ date, ...product }),
    });
  },
  async saveKegStock(date: string, keg: { opening: number; added: number; buy_price: number; sell_price: number }): Promise<void> {
    await request<void>('/daily/stock/keg', {
      method: 'POST',
      body: JSON.stringify({ date, ...keg }),
    });
  },
  async saveKegBalance(date: string, keg: { closing: number | null; total_money: number | null; overflow: number }): Promise<void> {
    await request<void>('/daily/balance/keg', {
      method: 'POST',
      body: JSON.stringify({ date, ...keg }),
    });
  },

  // Reports & Summaries
  async getDaySummary(date: string): Promise<DaySummary> {
    return request<DaySummary>(`/reports/summary?date=${date}`);
  },
  async getWeekReport(date: string): Promise<DaySummary[]> {
    return request<DaySummary[]>(`/reports/week?date=${date}`);
  },
  async getMonthReport(date: string): Promise<DaySummary[]> {
    return request<DaySummary[]>(`/reports/month?date=${date}`);
  },
  async getTransactions(date: string): Promise<any[]> {
    return request<any[]>(`/reports/transactions?date=${date}`);
  },
  async getAuditLogs(date: string): Promise<any[]> {
    return request<any[]>(`/reports/audit?date=${date}`);
  },
};

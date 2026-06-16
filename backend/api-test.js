const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5000/api';
const TENANT = 'test_tenant_balance_bug';
const token = jwt.sign(
  { tenantId: TENANT, userId: 'test_user', username: 'test', role: 'admin' },
  'super-secret-key-for-bar-book',
  { expiresIn: '7d' }
);

const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': TENANT,
  'Authorization': `Bearer ${token}`
};

async function test() {
  const date = '2026-06-15';
  
  // Set up day 1 (yesterday) to have an overflow of 50.
  // Wait, I can't inject data directly unless I use DB.
  // Let's just do day 1.
  
  let res = await fetch(`${API_URL}/daily/state?date=${date}`, { headers });
  console.log('State status:', res.status);
  const text = await res.text();
  if (!res.ok) return;
  let state = JSON.parse(text);
  console.log('Initial State:', state.keg);

  res = await fetch(`${API_URL}/daily/balance`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      date,
      products: [],
      keg: { opening: 0, added: 0, closing: 0, buy_price: 6000, sell_price: 7500, overflow: 0, total_money: 1000 },
      totalCollected: 1000
    })
  });
  console.log('Close Day 1:', await res.text());

  res = await fetch(`${API_URL}/daily/state?date=${date}`, { headers });
  state = JSON.parse(await res.text());
  console.log('State after close 1:', state.keg);

  res = await fetch(`${API_URL}/daily/balance`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      date,
      products: [],
      keg: { opening: 0, added: 0, closing: 0, buy_price: 6000, sell_price: 7500, overflow: state.keg.overflow, total_money: state.keg.total_money },
      totalCollected: state.keg.total_money
    })
  });
  console.log('Close Day 1 AGAIN:', await res.text());

  res = await fetch(`${API_URL}/daily/state?date=${date}`, { headers });
  state = JSON.parse(await res.text());
  console.log('State after close 2:', state.keg);
}
test();
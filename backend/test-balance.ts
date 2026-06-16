import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const tenantId = 'test_tenant';
  const date = '2026-06-15';
  await pool.query(`DELETE FROM day_kegs WHERE tenant_id = $1`, [tenantId]);
  await pool.query(`DELETE FROM day_products WHERE tenant_id = $1`, [tenantId]);
  
  // Create previous day
  await pool.query(`
    INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow)
    VALUES ($1, '2026-06-14', 0, 0, 0, 6000, 7500, 0, 50)
  `, [tenantId]);
  
  // Simulate POST /daily/balance
  const products = [];
  const keg = { opening: 0, added: 0, closing: 0, sell_price: 7500, buy_price: 6000, total_money: 1000, expenses: 0 };
  const totalCollected = 1000;
  
  const expectedBottledSales = 0;
  
  // 1. Fetch incoming overflow
  const prevRows = await pool.query(`
    SELECT overflow::float AS overflow FROM day_kegs
    WHERE tenant_id = $1 AND date < $2 AND closing IS NOT NULL
    ORDER BY date DESC LIMIT 1
  `, [tenantId, date]);
  const incomingOverflow = prevRows.rows[0]?.overflow || 0;
  
  const expectedKegMoney = 0;
  const actualKegMoney = totalCollected - expectedBottledSales + incomingOverflow;
  const diff = actualKegMoney - expectedKegMoney;
  
  console.log({ incomingOverflow, expectedKegMoney, actualKegMoney, diff });
  
  // Save
  await pool.query(`
    INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, expenses)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [tenantId, date, 0, 0, 0, 6000, 7500, totalCollected, diff, 0]);
  
  // Now RE-RUN the same POST /daily/balance (simulating re-entering)
  const prevRows2 = await pool.query(`
    SELECT overflow::float AS overflow FROM day_kegs
    WHERE tenant_id = $1 AND date < $2 AND closing IS NOT NULL
    ORDER BY date DESC LIMIT 1
  `, [tenantId, date]);
  const incomingOverflow2 = prevRows2.rows[0]?.overflow || 0;
  
  const actualKegMoney2 = totalCollected - expectedBottledSales + incomingOverflow2;
  const diff2 = actualKegMoney2 - expectedKegMoney;
  
  console.log("Rerun:", { incomingOverflow2, expectedKegMoney, actualKegMoney2, diff2 });
  
  await pool.query(`
    UPDATE day_kegs SET overflow = $1 WHERE tenant_id = $2 AND date = $3
  `, [diff2, tenantId, date]);
}
run().catch(console.error).finally(() => pool.end());

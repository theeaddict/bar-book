import { pool } from './src/db';

async function reopen(date: string) {
  const tenantId = 'd3b07384-d113-4956-a5cc-9c60dfd69453';
  const safeSchema = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log(`Reopening day ${date} for tenant ${tenantId}...`);
    
    // 1. Reset Day Kegs (set closing and total_money to null)
    await client.query(
      `UPDATE "${safeSchema}".day_kegs 
       SET closing = NULL, total_money = NULL, overflow = 0, skipped_reason = NULL
       WHERE date = $1`,
      [date]
    );
    
    // 2. Reset Day Products (set left_count to null)
    await client.query(
      `UPDATE "${safeSchema}".day_products 
       SET left_count = NULL 
       WHERE date = $1`,
      [date]
    );
    
    await client.query('COMMIT');
    console.log(`Successfully reopened day ${date}. You can now re-balance it on the dashboard.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to reopen day:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

const targetDate = process.argv[2] || '2026-06-16';
reopen(targetDate).catch(console.error);

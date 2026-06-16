"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.withTenant = withTenant;
exports.auditLog = auditLog;
// src/db.ts
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: require('path').join(__dirname, '..', '.env') });
// DATABASE_URL is validated at startup in index.ts — guaranteed to exist here
const connectionString = process.env.DATABASE_URL;
exports.pool = new pg_1.Pool({
    connectionString,
});
const initializedTenants = new Set();
const tenantInitLocks = new Map();
// Initialize global tables (like users)
async function initGlobalTables() {
    const client = await exports.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'staff',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Migrations for existing DBs
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id UUID`);
        await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff'`);
        await client.query(`UPDATE public.users SET tenant_id = id WHERE tenant_id IS NULL`);
        await client.query(`UPDATE public.users SET role = 'admin' WHERE id = tenant_id`);
    }
    finally {
        client.release();
    }
}
// Call init global tables
initGlobalTables().catch(console.error);
/**
 * Ensures tables exist for a tenant schema.
 * Uses a dedicated connection so DDL is committed immediately, outside the request transaction.
 * Concurrent calls for the same tenant are serialized via tenantInitLocks.
 */
async function ensureTablesForTenant(tenantId) {
    if (initializedTenants.has(tenantId))
        return;
    let lock = tenantInitLocks.get(tenantId);
    if (lock)
        return lock;
    lock = (async () => {
        if (initializedTenants.has(tenantId))
            return;
        const safeSchema = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const client = await exports.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}"`);
            await client.query(`SET LOCAL search_path TO "${safeSchema}", public`);
            await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
            await ensureTablesExist(client, tenantId);
            await client.query('COMMIT');
            initializedTenants.add(tenantId);
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
            tenantInitLocks.delete(tenantId);
        }
    })();
    tenantInitLocks.set(tenantId, lock);
    await lock;
}
/**
 * Executes a callback within a database client transaction.
 * Configures the search path to the tenant's schema tenant_{uuid} (with hyphens replaced by underscores)
 * and sets the session level app.tenant_id variable for RLS policies.
 *
 * Tables are initialized BEFORE acquiring the request connection to avoid exhausting the pool
 * (the init uses its own connection and releases it before the request transaction begins).
 */
async function withTenant(tenantId, callback) {
    // Ensure tables exist first (uses its own connection, released before we acquire ours)
    await ensureTablesForTenant(tenantId);
    const safeSchema = `tenant_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        // Create schema if not exists (harmless no-op if already present)
        try {
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchema}"`);
        }
        catch (err) {
            if (err.code !== '23505')
                throw err;
        }
        await client.query(`SET LOCAL search_path TO "${safeSchema}", public`);
        await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Creates tenant tables inside their respective schema if not already present.
 */
async function ensureTablesExist(client, tenantId) {
    // settings
    await client.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // products
    await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      group_name TEXT NOT NULL,
      name TEXT NOT NULL,
      buy_price INTEGER NOT NULL,
      sell_price INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // day_products
    await client.query(`
    CREATE TABLE IF NOT EXISTS day_products (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      date DATE NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      opening INTEGER NOT NULL DEFAULT 0,
      added INTEGER NOT NULL DEFAULT 0,
      left_count INTEGER,
      buy_price INTEGER NOT NULL,
      sell_price INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, date, product_id)
    )
  `);
    // day_kegs
    await client.query(`
    CREATE TABLE IF NOT EXISTS day_kegs (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      date DATE NOT NULL,
      opening INTEGER NOT NULL DEFAULT 0,
      added INTEGER NOT NULL DEFAULT 0,
      closing INTEGER,
      buy_price INTEGER NOT NULL DEFAULT 6000,
      sell_price INTEGER NOT NULL DEFAULT 7500,
      total_money INTEGER,
      overflow INTEGER NOT NULL DEFAULT 0,
      expenses INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, date)
    )
  `);
    await client.query(`ALTER TABLE day_kegs ADD COLUMN IF NOT EXISTS expenses INTEGER NOT NULL DEFAULT 0`);
    await client.query(`
    ALTER TABLE day_kegs ADD COLUMN IF NOT EXISTS skipped_reason TEXT;
  `);
    // audit_logs
    await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      username TEXT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS username TEXT`);
    // Enable RLS and setup policies for this schema's tables
    const tables = ['products', 'day_products', 'day_kegs', 'audit_logs'];
    for (const table of tables) {
        await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
        // Drop policy if exists and recreate to ensure it is up to date
        await client.query(`DROP POLICY IF EXISTS "tenant_${table}_policy" ON "${table}"`);
        await client.query(`
      CREATE POLICY "tenant_${table}_policy" ON "${table}"
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
    `);
    }
}
/**
 * Logs a write operation after successful database write.
 */
async function auditLog(client, tenantId, username, action, tableName, recordId, payload) {
    await client.query(`INSERT INTO audit_logs (tenant_id, username, action, table_name, record_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`, [tenantId, username, action, tableName, recordId, JSON.stringify(payload)]);
}

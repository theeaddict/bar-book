-- supabase.sql
-- Schema setup for Bar Book multi-tenant system

-- Enable Row-Level Security (RLS) on all tables

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    name TEXT NOT NULL,
    buy_price INTEGER NOT NULL,
    sell_price INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_products_policy ON products 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id', true));

-- 2. DAY PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS day_products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    date DATE NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    opening INTEGER NOT NULL DEFAULT 0,
    added INTEGER NOT NULL DEFAULT 0,
    left_count NUMERIC(10,2),
    buy_price INTEGER NOT NULL,
    sell_price INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, date, product_id)
);

ALTER TABLE day_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_day_products_policy ON day_products 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id', true));

-- 3. DAY KEGS TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, date)
);

ALTER TABLE day_kegs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_day_kegs_policy ON day_kegs 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id', true));

-- 4. AUDIT LOGS TABLE (Requirement: "All writes MUST call auditLog() after success")
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_audit_logs_policy ON audit_logs 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id', true));

-- 5. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_policy ON settings 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id', true));

-- Default tenant seed context
-- To seed default products, set app.tenant_id setting first:
-- SET app.tenant_id = 'default_tenant';
-- INSERT INTO products (id, tenant_id, group_name, name, buy_price, sell_price) VALUES ...

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/daily.ts
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const DayProductInputSchema = zod_1.z.object({
    product_id: zod_1.z.string(),
    opening: zod_1.z.number().int().nonnegative(),
    added: zod_1.z.number().int().nonnegative(),
    left_count: zod_1.z.number().nonnegative().nullable(),
    buy_price: zod_1.z.number().int().nonnegative(),
    sell_price: zod_1.z.number().int().nonnegative(),
});
const DayKegInputSchema = zod_1.z.object({
    opening: zod_1.z.number().int().nonnegative(),
    added: zod_1.z.number().int().nonnegative(),
    closing: zod_1.z.number().int().nonnegative().nullable(),
    buy_price: zod_1.z.number().int().nonnegative(),
    sell_price: zod_1.z.number().int().nonnegative(),
    total_money: zod_1.z.number().int().nonnegative().nullable(),
    overflow: zod_1.z.number().int(),
    expenses: zod_1.z.number().int().nonnegative().optional().default(0),
});
const SaveStockSchema = zod_1.z.object({
    date: zod_1.z.string(),
    products: zod_1.z.array(DayProductInputSchema),
    keg: DayKegInputSchema,
});
const CloseDaySchema = zod_1.z.object({
    date: zod_1.z.string(),
    products: zod_1.z.array(DayProductInputSchema),
    keg: DayKegInputSchema,
    totalCollected: zod_1.z.number().int().nonnegative(),
});
// Helpers: pure UTC date arithmetic (YYYY-MM-DD)
function getYesterdayDateString(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split('T')[0];
}
// GET /daily/state?date=YYYY-MM-DD
router.get('/state', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'date query parameter is required' });
        }
        const dailyState = await (0, db_1.withTenant)(tenantId, async (client) => {
            // 1. Fetch active products from catalog
            const { rows: products } = await client.query('SELECT id, name, group_name, buy_price, sell_price FROM products');
            // 2. Fetch day's day_products
            const { rows: dayProducts } = await client.query(`SELECT dp.id, dp.product_id, dp.opening::float AS opening, dp.added::float AS added, dp.left_count::float AS left_count,
                dp.buy_price, dp.sell_price, p.name, p.group_name
         FROM day_products dp
         JOIN products p ON dp.product_id = p.id
         WHERE dp.tenant_id = $1 AND dp.date = $2`, [tenantId, date]);
            // 3. Fetch day's keg
            const { rows: dayKegRows } = await client.query(`SELECT id, date, opening::float AS opening, added::float AS added, closing::float AS closing, buy_price, sell_price, total_money, overflow::float AS overflow, expenses FROM day_kegs WHERE tenant_id = $1 AND date = $2`, [tenantId, date]);
            // Build map of existing day_products for this date
            const dayProductMap = new Map();
            for (const dp of dayProducts) {
                dayProductMap.set(dp.product_id, dp);
            }
            // Fetch carry-forward stock from last closed day
            const { rows: lastClosedDateRows } = await client.query(`SELECT date::text AS date FROM day_kegs 
         WHERE tenant_id = $1 AND date < $2 AND closing IS NOT NULL AND (skipped_reason IS NULL OR skipped_reason = '')
         ORDER BY date DESC LIMIT 1`, [tenantId, date]);
            let carryKegOpening = 0;
            let carryKegBuyPrice = 0;
            let carryKegSellPrice = 0;
            const yesterdayProductsMap = new Map();
            if (lastClosedDateRows.length > 0) {
                const lastClosedDate = lastClosedDateRows[0].date;
                const { rows: yesterdayProducts } = await client.query('SELECT product_id, left_count::float AS left_count FROM day_products WHERE tenant_id = $1 AND date = $2', [tenantId, lastClosedDate]);
                for (const yp of yesterdayProducts) {
                    if (yp.left_count !== null) {
                        yesterdayProductsMap.set(yp.product_id, yp.left_count);
                    }
                }
                const { rows: yesterdayKegRows } = await client.query('SELECT closing::float AS closing, buy_price, sell_price FROM day_kegs WHERE tenant_id = $1 AND date = $2', [tenantId, lastClosedDate]);
                if (yesterdayKegRows.length > 0) {
                    carryKegOpening = yesterdayKegRows[0].closing || 0;
                    carryKegBuyPrice = yesterdayKegRows[0].buy_price || 0;
                    carryKegSellPrice = yesterdayKegRows[0].sell_price || 0;
                }
            }
            // Merge ALL catalog products with day_products data (carry-forward previous closing stock)
            const resultProducts = products.map((p) => {
                const carryOpening = yesterdayProductsMap.get(p.id) || 0;
                const existing = dayProductMap.get(p.id);
                if (existing) {
                    // Force opening to always match carry-forward to fix ripple-effect when editing previous days
                    return { ...existing, opening: carryOpening };
                }
                return {
                    product_id: p.id,
                    name: p.name,
                    group_name: p.group_name,
                    opening: carryOpening,
                    added: 0,
                    left_count: null,
                    buy_price: p.buy_price,
                    sell_price: p.sell_price,
                };
            });
            // Ensure keg data exists
            let resultKeg = dayKegRows[0] || null;
            if (!resultKeg) {
                resultKeg = {
                    date,
                    opening: carryKegOpening,
                    added: 0,
                    closing: null,
                    buy_price: carryKegBuyPrice,
                    sell_price: carryKegSellPrice,
                    total_money: null,
                    overflow: 0,
                    expenses: 0,
                };
            }
            else {
                // Force opening to always match carry-forward
                resultKeg = { ...resultKeg, opening: carryKegOpening };
            }
            // Check if previous day is resolved (either has a closing balance or a skipped reason)
            const yesterdayStr = getYesterdayDateString(date);
            const { rows: priorRows } = await client.query('SELECT 1 FROM day_kegs WHERE tenant_id = $1 AND date < $2 LIMIT 1', [tenantId, date]);
            const hasPriorDays = priorRows.length > 0;
            let isPreviousDayResolved = true;
            if (hasPriorDays) {
                const { rows: yesterdayRows } = await client.query(`SELECT 1 FROM day_kegs 
           WHERE tenant_id = $1 AND date = $2 
             AND (closing IS NOT NULL OR skipped_reason IS NOT NULL)`, [tenantId, yesterdayStr]);
                isPreviousDayResolved = yesterdayRows.length > 0;
            }
            return {
                products: resultProducts,
                keg: resultKeg,
                isPreviousDayResolved,
                previousDate: yesterdayStr
            };
        });
        res.json(dailyState);
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/stock
router.post('/stock', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date, products, keg } = SaveStockSchema.parse(req.body);
        await (0, db_1.withTenant)(tenantId, async (client) => {
            // 1. Save day products
            for (const p of products) {
                await client.query(`INSERT INTO day_products (tenant_id, date, product_id, opening, added, left_count, buy_price, sell_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, date, product_id)
           DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added,
                         buy_price = EXCLUDED.buy_price, sell_price = EXCLUDED.sell_price`, [tenantId, date, p.product_id, p.opening, p.added, p.left_count, p.buy_price, p.sell_price]);
            }
            // 2. Save day keg
            await client.query(`INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, expenses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, date)
         DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added,
                       buy_price = EXCLUDED.buy_price, sell_price = EXCLUDED.sell_price,
                       overflow = EXCLUDED.overflow, expenses = EXCLUDED.expenses`, [tenantId, date, keg.opening, keg.added, keg.closing, keg.buy_price, keg.sell_price, keg.total_money, keg.overflow, keg.expenses || 0]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SAVE_DAILY_STOCK', 'day_products_and_kegs', date, { products, keg });
        });
        res.json({ message: 'Daily stock saved successfully' });
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/balance (Close Day)
router.post('/balance', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date, products, keg, totalCollected } = CloseDaySchema.parse(req.body);
        // Backend Validation: You cannot sell what you do not have
        for (const p of products) {
            const totalAvailable = p.opening + p.added;
            if (totalAvailable > 0 && p.left_count == null) {
                return res.status(400).json({
                    error: `Validation error: Product ID ${p.product_id} is missing balance.`
                });
            }
            const left = p.left_count ?? 0;
            if (left > totalAvailable) {
                return res.status(400).json({
                    error: `Validation error: Product ID ${p.product_id} left count (${left}) exceeds total stock available (${totalAvailable}).`
                });
            }
        }
        if (keg.closing !== null) {
            const totalAvailableKegs = keg.opening + keg.added;
            if (keg.closing > totalAvailableKegs) {
                return res.status(400).json({
                    error: `Validation error: Keg closing (${keg.closing}) exceeds total available (${totalAvailableKegs}).`
                });
            }
        }
        await (0, db_1.withTenant)(tenantId, async (client) => {
            // 1. Calculate bottled total expected sales money
            let expectedBottledSales = 0;
            for (const p of products) {
                const total = p.opening + p.added;
                const left = p.left_count ?? total;
                const sold = Math.max(0, total - left);
                expectedBottledSales += sold * p.sell_price;
            }
            // 2. No carry-forward overflow; new day starts with zero balance
            const incomingOverflow = 0;
            // 3. Calculate keg details for overflow carry-forward
            const totalKegs = keg.opening + keg.added;
            const drumsSold = keg.closing !== null ? Math.max(0, totalKegs - keg.closing) : 0;
            const expectedKegMoney = drumsSold * keg.sell_price;
            // totalCollected is the Gross Money Collected. 
            // The business expects the Net Handover to cover the expected sales.
            const expenses = keg.expenses || 0;
            const netHandover = totalCollected - expenses;
            const actualKegMoney = netHandover - expectedBottledSales + incomingOverflow;
            const diff = actualKegMoney - expectedKegMoney;
            // The full diff (positive or negative) becomes the new carried balance
            const carryOverflow = diff;
            // Update and save Day Keg
            const finalKeg = {
                ...keg,
                total_money: totalCollected,
                overflow: carryOverflow,
                expenses: keg.expenses || 0,
            };
            // Save day products
            for (const p of products) {
                await client.query(`INSERT INTO day_products (tenant_id, date, product_id, opening, added, left_count, buy_price, sell_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, date, product_id)
           DO UPDATE SET left_count = EXCLUDED.left_count, buy_price = EXCLUDED.buy_price, sell_price = EXCLUDED.sell_price`, [tenantId, date, p.product_id, p.opening, p.added, p.left_count, p.buy_price, p.sell_price]);
            }
            // Save day keg
            await client.query(`INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, expenses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, date)
         DO UPDATE SET closing = EXCLUDED.closing, total_money = EXCLUDED.total_money, overflow = EXCLUDED.overflow, expenses = EXCLUDED.expenses`, [tenantId, date, finalKeg.opening, finalKeg.added, finalKeg.closing, finalKeg.buy_price, finalKeg.sell_price, finalKeg.total_money, finalKeg.overflow, finalKeg.expenses]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'CLOSE_DAY', 'day_products_and_kegs', date, { products, keg: finalKeg, totalCollected });
        });
        res.json({ message: 'Day closed and balanced successfully' });
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/skip
const SkipDaySchema = zod_1.z.object({
    date: zod_1.z.string(),
    reason: zod_1.z.string().min(1, 'Reason is required'),
});
router.post('/skip', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date, reason } = SkipDaySchema.parse(req.body);
        await (0, db_1.withTenant)(tenantId, async (client) => {
            // 1. Check if previous day is resolved
            const yesterdayStr = getYesterdayDateString(date);
            const { rows: priorRows } = await client.query('SELECT 1 FROM day_kegs WHERE tenant_id = $1 AND date < $2 LIMIT 1', [tenantId, date]);
            if (priorRows.length > 0) {
                const { rows: yesterdayRows } = await client.query(`SELECT 1 FROM day_kegs 
           WHERE tenant_id = $1 AND date = $2 
             AND (closing IS NOT NULL OR skipped_reason IS NOT NULL)`, [tenantId, yesterdayStr]);
                if (yesterdayRows.length === 0) {
                    throw new Error(`Cannot skip ${date} because the previous day ${yesterdayStr} is not resolved.`);
                }
            }
            // 2. Fetch carry-forward stock to preserve it during skipped day
            const { rows: lastClosedDateRows } = await client.query(`SELECT date::text AS date FROM day_kegs 
         WHERE tenant_id = $1 AND date < $2 AND closing IS NOT NULL AND (skipped_reason IS NULL OR skipped_reason = '')
         ORDER BY date DESC LIMIT 1`, [tenantId, date]);
            let carryKegOpening = 0;
            let carryKegBuyPrice = 0;
            let carryKegSellPrice = 0;
            const yesterdayProductsMap = new Map();
            if (lastClosedDateRows.length > 0) {
                const lastClosedDate = lastClosedDateRows[0].date;
                const { rows: yesterdayProducts } = await client.query('SELECT product_id, left_count::float AS left_count FROM day_products WHERE tenant_id = $1 AND date = $2', [tenantId, lastClosedDate]);
                for (const yp of yesterdayProducts) {
                    if (yp.left_count !== null)
                        yesterdayProductsMap.set(yp.product_id, yp.left_count);
                }
                const { rows: yesterdayKegRows } = await client.query('SELECT closing::float AS closing, buy_price, sell_price FROM day_kegs WHERE tenant_id = $1 AND date = $2', [tenantId, lastClosedDate]);
                if (yesterdayKegRows.length > 0) {
                    carryKegOpening = yesterdayKegRows[0].closing || 0;
                    carryKegBuyPrice = yesterdayKegRows[0].buy_price || 0;
                    carryKegSellPrice = yesterdayKegRows[0].sell_price || 0;
                }
            }
            // 3. Save skipped day products (preserve carry-forward)
            const { rows: products } = await client.query('SELECT id, buy_price, sell_price FROM products WHERE tenant_id = $1', [tenantId]);
            for (const p of products) {
                const carryOpening = yesterdayProductsMap.get(p.id) || 0;
                await client.query(`INSERT INTO day_products (tenant_id, date, product_id, opening, added, left_count, buy_price, sell_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, date, product_id)
           DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added, left_count = EXCLUDED.left_count`, [tenantId, date, p.id, carryOpening, 0, carryOpening, p.buy_price, p.sell_price]);
            }
            // 4. Save skipped day keg (preserve carry-forward)
            await client.query(`INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, skipped_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, date)
         DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added, closing = EXCLUDED.closing,
                       overflow = EXCLUDED.overflow, skipped_reason = EXCLUDED.skipped_reason,
                       total_money = EXCLUDED.total_money`, [tenantId, date, carryKegOpening, 0, carryKegOpening, carryKegBuyPrice, carryKegSellPrice, 0, 0, reason]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SKIP_DAY', 'day_kegs', date, { date, reason });
        });
        res.json({ message: 'Day skipped successfully' });
    }
    catch (error) {
        next(error);
    }
});
// ─── Single-Product/Keg Save Endpoints ───
const SaveSingleProductStockSchema = zod_1.z.object({
    date: zod_1.z.string(),
    product_id: zod_1.z.string(),
    opening: zod_1.z.number().int().nonnegative(),
    added: zod_1.z.number().int().nonnegative(),
    buy_price: zod_1.z.number().int().nonnegative(),
    sell_price: zod_1.z.number().int().nonnegative(),
});
const SaveSingleProductBalanceSchema = zod_1.z.object({
    date: zod_1.z.string(),
    product_id: zod_1.z.string(),
    left_count: zod_1.z.number().nonnegative().nullable(),
    opening: zod_1.z.number().int().nonnegative().optional().default(0),
    added: zod_1.z.number().int().nonnegative().optional().default(0),
    buy_price: zod_1.z.number().int().nonnegative(),
    sell_price: zod_1.z.number().int().nonnegative(),
});
const SaveKegStockSchema = zod_1.z.object({
    date: zod_1.z.string(),
    opening: zod_1.z.number().int().nonnegative(),
    added: zod_1.z.number().int().nonnegative(),
    buy_price: zod_1.z.number().int().nonnegative(),
    sell_price: zod_1.z.number().int().nonnegative(),
});
const SaveKegBalanceSchema = zod_1.z.object({
    date: zod_1.z.string(),
    closing: zod_1.z.number().int().nonnegative().nullable(),
    total_money: zod_1.z.number().int().nonnegative().nullable(),
    overflow: zod_1.z.number().int(),
    expenses: zod_1.z.number().int().nonnegative().optional().default(0),
});
// POST /daily/stock/product — save a single product's stock (opening, added, prices)
router.post('/stock/product', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId)
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        const { date, product_id, opening, added, buy_price, sell_price } = SaveSingleProductStockSchema.parse(req.body);
        await (0, db_1.withTenant)(tenantId, async (client) => {
            await client.query(`INSERT INTO day_products (tenant_id, date, product_id, opening, added, left_count, buy_price, sell_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, date, product_id)
         DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added,
                       buy_price = EXCLUDED.buy_price, sell_price = EXCLUDED.sell_price`, [tenantId, date, product_id, opening, added, null, buy_price, sell_price]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SAVE_PRODUCT_STOCK', 'day_products', `${date}_${product_id}`, req.body);
        });
        res.json({ message: 'Product stock saved' });
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/balance/product — save a single product's balance (left_count)
router.post('/balance/product', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId)
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        const { date, product_id, left_count, opening, added, buy_price, sell_price } = SaveSingleProductBalanceSchema.parse(req.body);
        if (left_count !== null) {
            const totalAvailable = opening + added;
            if (left_count > totalAvailable) {
                return res.status(400).json({ error: `Validation error: Balance (${left_count}) exceeds total available stock (${totalAvailable}).` });
            }
        }
        await (0, db_1.withTenant)(tenantId, async (client) => {
            await client.query(`INSERT INTO day_products (tenant_id, date, product_id, opening, added, left_count, buy_price, sell_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, date, product_id)
         DO UPDATE SET left_count = EXCLUDED.left_count`, [tenantId, date, product_id, opening, added, left_count, buy_price, sell_price]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SAVE_PRODUCT_BALANCE', 'day_products', `${date}_${product_id}`, req.body);
        });
        res.json({ message: 'Product balance saved' });
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/stock/keg — save keg stock (opening, added, prices)
router.post('/stock/keg', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId)
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        const { date, opening, added, buy_price, sell_price } = SaveKegStockSchema.parse(req.body);
        await (0, db_1.withTenant)(tenantId, async (client) => {
            await client.query(`INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, expenses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, date)
         DO UPDATE SET opening = EXCLUDED.opening, added = EXCLUDED.added,
                       buy_price = EXCLUDED.buy_price, sell_price = EXCLUDED.sell_price`, [tenantId, date, opening, added, null, buy_price, sell_price, null, 0, 0]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SAVE_KEG_STOCK', 'day_kegs', date, req.body);
        });
        res.json({ message: 'Keg stock saved' });
    }
    catch (error) {
        next(error);
    }
});
// POST /daily/balance/keg — save keg balance (closing, total_money, overflow)
router.post('/balance/keg', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId)
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        const { date, closing, total_money, overflow } = SaveKegBalanceSchema.parse(req.body);
        await (0, db_1.withTenant)(tenantId, async (client) => {
            await client.query(`INSERT INTO day_kegs (tenant_id, date, opening, added, closing, buy_price, sell_price, total_money, overflow, expenses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (tenant_id, date)
         DO UPDATE SET closing = EXCLUDED.closing, total_money = EXCLUDED.total_money, overflow = EXCLUDED.overflow, expenses = EXCLUDED.expenses`, [tenantId, date, 0, 0, closing, 0, 0, total_money, overflow || 0, req.body.expenses || 0]);
            await (0, db_1.auditLog)(client, tenantId, req.user?.username || 'unknown', 'SAVE_KEG_BALANCE', 'day_kegs', date, req.body);
        });
        res.json({ message: 'Keg balance saved' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/reports.ts
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Helpers: pure UTC date arithmetic (YYYY-MM-DD)
function getWeekDates(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
    const sunday = new Date(Date.UTC(y, m - 1, d - dow));
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const next = new Date(sunday);
        next.setUTCDate(next.getUTCDate() + i);
        dates.push(next.toISOString().split('T')[0]);
    }
    return dates;
}
function getMonthDates(dateStr) {
    const [y, m] = dateStr.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month = last day of current month
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(Date.UTC(y, m - 1, i));
        dates.push(day.toISOString().split('T')[0]);
    }
    return dates;
}
// Helper to compute daily summary stats matching DaySummary type
async function getDailySummaryForDate(client, tenantId, date) {
    // Fetch day's products
    const { rows: dayProducts } = await client.query(`SELECT dp.opening::float AS opening, dp.added::float AS added, dp.left_count::float AS left_count, dp.buy_price, dp.sell_price
     FROM day_products dp
     WHERE dp.tenant_id = $1 AND dp.date = $2`, [tenantId, date]);
    // Fetch day's keg
    const { rows: dayKegs } = await client.query(`SELECT opening::float AS opening, added::float AS added, closing::float AS closing, buy_price, sell_price, total_money, overflow::float AS overflow, expenses::float AS expenses
     FROM day_kegs
     WHERE tenant_id = $1 AND date = $2`, [tenantId, date]);
    const has_products = dayProducts.length > 0;
    const has_keg = dayKegs.length > 0;
    let bottled_sales = 0;
    let bottled_profit = 0;
    let bottled_cost = 0;
    for (const p of dayProducts) {
        if (p.left_count !== null) {
            const sold = Math.max(0, (p.opening + p.added) - p.left_count);
            bottled_sales += sold * p.sell_price;
            bottled_cost += sold * p.buy_price;
            bottled_profit += sold * (p.sell_price - p.buy_price);
        }
    }
    let keg_sales = 0;
    let keg_profit = 0;
    let keg_cost = 0;
    let kegs_finished = 0;
    let expected_keg_money = 0;
    let actual_keg_money = 0;
    let keg_diff = 0;
    let carried_overflow = 0;
    let total_collected = 0;
    let expenses = 0;
    if (dayKegs.length > 0) {
        const keg = dayKegs[0];
        carried_overflow = keg.overflow;
        expenses = keg.expenses || 0;
        if (keg.closing !== null) {
            kegs_finished = Math.max(0, (keg.opening + keg.added) - keg.closing);
            keg_sales = kegs_finished * keg.sell_price;
            keg_cost = kegs_finished * keg.buy_price;
            keg_profit = kegs_finished * (keg.sell_price - keg.buy_price);
            expected_keg_money = kegs_finished * keg.sell_price;
            total_collected = keg.total_money || (bottled_sales + keg_sales);
            actual_keg_money = total_collected - bottled_sales;
            keg_diff = actual_keg_money - expected_keg_money;
        }
    }
    // Fallback collected
    if (total_collected === 0 && (bottled_sales > 0 || keg_sales > 0)) {
        if (dayKegs.length > 0 && dayKegs[0].closing !== null) {
            total_collected = bottled_sales + keg_sales;
        }
    }
    const total_sales = bottled_sales + keg_sales;
    const total_profit = bottled_profit + keg_profit - expenses;
    return {
        date,
        bottled_sales,
        bottled_profit,
        bottled_cost,
        keg_sales,
        keg_profit,
        keg_cost,
        kegs_finished,
        expected_keg_money,
        actual_keg_money,
        keg_diff,
        carried_overflow,
        expenses,
        total_collected,
        total_sales,
        total_profit,
        has_keg,
        has_products,
    };
}
// GET /reports/summary?date=YYYY-MM-DD
router.get('/summary', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'date parameter is required' });
        }
        const summary = await (0, db_1.withTenant)(tenantId, async (client) => {
            return await getDailySummaryForDate(client, tenantId, date);
        });
        res.json(summary);
    }
    catch (error) {
        next(error);
    }
});
// Batch-fetch summaries for a range of dates (single SQL pass instead of N queries)
async function getSummariesForDateRange(client, tenantId, dates) {
    if (dates.length === 0)
        return [];
    const { rows: dayProductsRows } = await client.query(`SELECT dp.date::text AS date, dp.opening::float AS opening, dp.added::float AS added,
            dp.left_count::float AS left_count, dp.buy_price, dp.sell_price
     FROM day_products dp
     WHERE dp.tenant_id = $1 AND dp.date = ANY($2::date[])`, [tenantId, dates]);
    const { rows: dayKegsRows } = await client.query(`SELECT dk.date::text AS date, dk.opening::float AS opening, dk.added::float AS added,
            dk.closing::float AS closing, dk.buy_price, dk.sell_price,
            dk.total_money, dk.overflow::float AS overflow, dk.expenses::float AS expenses
     FROM day_kegs dk
     WHERE dk.tenant_id = $1 AND dk.date = ANY($2::date[])`, [tenantId, dates]);
    // Index by date
    const prodsByDate = {};
    for (const r of dayProductsRows) {
        if (!prodsByDate[r.date])
            prodsByDate[r.date] = [];
        prodsByDate[r.date].push(r);
    }
    const kegsByDate = {};
    for (const r of dayKegsRows) {
        kegsByDate[r.date] = r;
    }
    return dates.map((date) => {
        const dayProducts = prodsByDate[date] || [];
        const dayKeg = kegsByDate[date] || null;
        let bottled_sales = 0, bottled_profit = 0, bottled_cost = 0;
        for (const p of dayProducts) {
            if (p.left_count !== null) {
                const sold = Math.max(0, (p.opening + p.added) - p.left_count);
                bottled_sales += sold * p.sell_price;
                bottled_cost += sold * p.buy_price;
                bottled_profit += sold * (p.sell_price - p.buy_price);
            }
        }
        let keg_sales = 0, keg_profit = 0, keg_cost = 0, kegs_finished = 0;
        let expected_keg_money = 0, actual_keg_money = 0, keg_diff = 0;
        let carried_overflow = 0, total_collected = 0, expenses = 0;
        if (dayKeg) {
            carried_overflow = dayKeg.overflow;
            expenses = dayKeg.expenses || 0;
            if (dayKeg.closing !== null) {
                kegs_finished = Math.max(0, (dayKeg.opening + dayKeg.added) - dayKeg.closing);
                keg_sales = kegs_finished * dayKeg.sell_price;
                keg_cost = kegs_finished * dayKeg.buy_price;
                keg_profit = kegs_finished * (dayKeg.sell_price - dayKeg.buy_price);
                expected_keg_money = kegs_finished * dayKeg.sell_price;
                total_collected = dayKeg.total_money || (bottled_sales + keg_sales);
                actual_keg_money = total_collected - bottled_sales;
                keg_diff = actual_keg_money - expected_keg_money;
            }
        }
        if (total_collected === 0 && (bottled_sales > 0 || keg_sales > 0) && dayKeg && dayKeg.closing !== null) {
            total_collected = bottled_sales + keg_sales;
        }
        const total_sales = bottled_sales + keg_sales;
        const total_profit = bottled_profit + keg_profit; // Gross Profit (excluding expenses)
        return {
            date, bottled_sales, bottled_profit, bottled_cost,
            keg_sales, keg_profit, keg_cost, kegs_finished,
            expected_keg_money, actual_keg_money, keg_diff, carried_overflow, expenses,
            total_collected, total_sales, total_profit,
            has_keg: !!dayKeg, has_products: dayProducts.length > 0,
        };
    });
}
// GET /reports/week?date=YYYY-MM-DD
router.get('/week', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'date parameter is required' });
        }
        const weekDates = getWeekDates(date);
        const reports = await (0, db_1.withTenant)(tenantId, async (client) => {
            return getSummariesForDateRange(client, tenantId, weekDates);
        });
        res.json(reports);
    }
    catch (error) {
        next(error);
    }
});
// GET /reports/month?date=YYYY-MM-DD
router.get('/month', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'date parameter is required' });
        }
        const monthDates = getMonthDates(date);
        const reports = await (0, db_1.withTenant)(tenantId, async (client) => {
            return getSummariesForDateRange(client, tenantId, monthDates);
        });
        res.json(reports);
    }
    catch (error) {
        next(error);
    }
});
// GET /reports/transactions?date=YYYY-MM-DD
router.get('/transactions', async (req, res, next) => {
    try {
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return res.status(400).json({ error: 'x-tenant-id header is required' });
        }
        const { date } = req.query;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'date parameter is required' });
        }
        const transactions = await (0, db_1.withTenant)(tenantId, async (client) => {
            const { rows: bottledRows } = await client.query(`SELECT p.name, p.group_name,
                dp.opening::float AS opening, dp.added::float AS added, dp.left_count::float AS left_count,
                dp.buy_price, dp.sell_price
         FROM day_products dp
         JOIN products p ON dp.product_id = p.id
         WHERE dp.tenant_id = $1 AND dp.date = $2`, [tenantId, date]);
            const { rows: kegRows } = await client.query(`SELECT opening::float AS opening, added::float AS added, closing::float AS closing, buy_price, sell_price
         FROM day_kegs
         WHERE tenant_id = $1 AND date = $2`, [tenantId, date]);
            const items = [];
            for (const r of bottledRows) {
                if (r.left_count !== null) {
                    const total = r.opening + r.added;
                    const sold = Math.max(0, total - r.left_count);
                    const revenue = sold * r.sell_price;
                    const cost = sold * r.buy_price;
                    items.push({
                        name: r.name,
                        opening: r.opening,
                        added: r.added,
                        total,
                        left_count: r.left_count,
                        sold,
                        sell_price: r.sell_price,
                        revenue,
                        profit: revenue - cost,
                    });
                }
            }
            for (const r of kegRows) {
                if (r.closing !== null) {
                    const total = r.opening + r.added;
                    const sold = Math.max(0, total - r.closing);
                    const revenue = sold * r.sell_price;
                    const cost = sold * r.buy_price;
                    items.push({
                        name: 'Keg',
                        opening: r.opening,
                        added: r.added,
                        total,
                        left_count: r.closing,
                        sold,
                        sell_price: r.sell_price,
                        revenue,
                        profit: revenue - cost,
                    });
                }
            }
            return items;
        });
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
});
router.get("/audit", async (req, res, next) => {
    const tenantId = req.headers["x-tenant-id"];
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: "date is required" });
    }
    try {
        const rows = await (0, db_1.withTenant)(tenantId, async (client) => {
            const { rows } = await client.query(`SELECT id, username, action, table_name, record_id, payload, created_at 
         FROM audit_logs 
         WHERE tenant_id = $1 AND DATE(created_at AT TIME ZONE 'UTC') = $2 
         ORDER BY created_at DESC`, [tenantId, date]);
            return rows;
        });
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.asyncHandler = asyncHandler;
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const products_1 = __importDefault(require("./routes/products"));
const daily_1 = __importDefault(require("./routes/daily"));
const reports_1 = __importDefault(require("./routes/reports"));
const auth_1 = __importDefault(require("./routes/auth"));
const settings_1 = __importDefault(require("./routes/settings"));
dotenv_1.default.config({ path: require('path').join(__dirname, '..', '.env') });
// ---------------------------------------------------------------------------
// Startup validation: crash early on missing required env vars
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
        console.error(`FATAL: Missing required environment variable: ${name}`);
        process.exit(1);
    }
}
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
exports.JWT_SECRET = process.env.JWT_SECRET;
// ---------------------------------------------------------------------------
// Safety net: prevent crash on any unhandled error
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION (kept alive):', reason);
});
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION (kept alive):', err);
});
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins to support local network access (e.g. from mobile devices on the same WiFi)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-tenant-id', 'Authorization', 'Accept', 'Origin'],
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/bar-name') || req.path === '/health') {
        return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
            if (!decoded.tenantId || !decoded.username || !decoded.role) {
                return res.status(401).json({ error: 'Invalid token payload' });
            }
            req.headers['x-tenant-id'] = decoded.tenantId;
            req.user = {
                id: decoded.userId || decoded.tenantId,
                username: decoded.username,
                role: decoded.role,
                tenantId: decoded.tenantId
            };
        }
        catch (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    else {
        // If no Bearer token, fail. (Removed x-tenant-id fallback for security)
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
// ---------------------------------------------------------------------------
// Wrap every async route handler so Express 4 catches rejections
// ---------------------------------------------------------------------------
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/daily', daily_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/settings', settings_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors,
        });
    }
    // Business-logic validation errors returned as 400
    const status = err.status || (err.message?.startsWith('Cannot skip') ? 400 : 500);
    if (status >= 500) {
        console.error('Internal Error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.status(status).json({
        error: err.message,
    });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

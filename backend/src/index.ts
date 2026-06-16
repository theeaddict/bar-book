// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import productsRouter from './routes/products';
import dailyRouter from './routes/daily';
import reportsRouter from './routes/reports';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

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

const app = express();
const port = process.env.PORT || 5000;
export const JWT_SECRET = process.env.JWT_SECRET!;

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
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(cors({
  origin: '*', // Allow all origins to support local network access (e.g. from mobile devices on the same WiFi)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-tenant-id', 'Authorization', 'Accept', 'Origin'],
}));

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// JWT Auth Middleware
// ---------------------------------------------------------------------------
// Add custom properties to Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        tenantId: string;
      };
    }
  }
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/bar-name') || req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { tenantId: string, userId: string, username: string, role: string };
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
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    // If no Bearer token, fail. (Removed x-tenant-id fallback for security)
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ---------------------------------------------------------------------------
// Wrap every async route handler so Express 4 catches rejections
// ---------------------------------------------------------------------------
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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

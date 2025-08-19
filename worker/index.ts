// Making changes to this file is **RISKY**
// You may create new routes, but do not modify existing routes unless they are marked as **REPLACE**
// Please follow the existing patterns and structure. For example, do not use `serveStatic` or any such thing that can break the existing functionality.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ClientErrorReport } from './types';
import { userRoutes } from './userRoutes';
import { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', logger());

// **DO NOT TOUCH THE CODE BELOW THIS LINE**
app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

userRoutes(app);
app.get('/api/health', (c) => c.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() }}));

app.post('/api/client-errors', async (c) => {
  try {
    const e = await c.req.json<ClientErrorReport>();
    if (!e.message || !e.url || !e.userAgent) return c.json({ success: false, error: 'Missing required fields' }, 400);
    console.error('[CLIENT ERROR]', JSON.stringify({ timestamp: e.timestamp || new Date().toISOString(), message: e.message, url: e.url, userAgent: e.userAgent, stack: e.stack, componentStack: e.componentStack, errorBoundary: e.errorBoundary, source: e.source, lineno: e.lineno, colno: e.colno }, null, 2));
    return c.json({ success: true });
  } catch (error) {
    console.error('[CLIENT ERROR HANDLER] Failed:', error);
    return c.json({ success: false, error: 'Failed to process' }, 500);
  }
});

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));
app.onError((err, c) => { console.error(`[ERROR] ${err}`); return c.json({ success: false, error: 'Internal Server Error' }, 500); });

console.log(`Server is running`)

export default { fetch: app.fetch } satisfies ExportedHandler<Bindings>;
import { Hono } from "hono";
import { Bindings, ClientErrorReport } from './types';
interface ContactPayload {
  name: string;
  email: string;
  message: string;
}
export function userRoutes(app: Hono<{ Bindings: Bindings }>) {
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));
    app.post('/api/contact', async (c) => {
      try {
        const body = await c.req.json<ContactPayload>();
        if (!body.name || typeof body.name !== 'string' || body.name.length < 2) {
          return c.json({ success: false, error: 'Valid name is required.' }, 400);
        }
        if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
          return c.json({ success: false, error: 'Valid email is required.' }, 400);
        }
        if (!body.message || typeof body.message !== 'string' || body.message.length < 10) {
          return c.json({ success: false, error: 'Message must be at least 10 characters.' }, 400);
        }
        console.log('Contact form submission received:', body);
        return c.json({ success: true });
      } catch (error) {
        console.error('Error processing contact form:', error);
        return c.json({ success: false, error: 'Invalid request body.' }, 400);
      }
    });
    app.post('/api/client-errors', async (c) => {
      try {
        const report = await c.req.json<ClientErrorReport>();
        if (!report || typeof report.message !== 'string' || report.message.trim() === '') {
          return c.json({ success: false, error: 'A valid error message is required.' }, 400);
        }
        // Log the error on the server side (worker console)
        console.error('Client-side error reported:', JSON.stringify(report, null, 2));
        // Always return success to the client to prevent re-queueing loops
        return c.json({ success: true });
      } catch (error) {
        console.error('Failed to parse client error report:', error);
        return c.json({ success: false, error: 'Invalid request body.' }, 400);
      }
    });
    return app;
}
export default userRoutes;
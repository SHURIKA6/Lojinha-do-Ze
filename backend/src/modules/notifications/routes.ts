import { Hono } from 'hono';

const router = new Hono<any>();

router.get('/ws', async (c) => {
  const id = c.env.NOTIFICATIONS_DO.idFromName("GLOBAL_NOTIFICATIONS");
  const stub = c.env.NOTIFICATIONS_DO.get(id);
  
  // Forward the WebSocket request to the Durable Object
  return stub.fetch(c.req.raw);
});

router.post('/broadcast', async (c) => {
  const body = await c.req.json();
  const id = c.env.NOTIFICATIONS_DO.idFromName("GLOBAL_NOTIFICATIONS");
  const stub = c.env.NOTIFICATIONS_DO.get(id);
  
  await stub.fetch(new Request('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify(body)
  }));
  
  return c.json({ success: true });
});

export default router;

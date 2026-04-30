import { Hono } from 'hono';
import { DeliveryLocationDO } from './locationDO';

const router = new Hono<{ Bindings: any }>();

router.post('/update', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  const body = await c.req.json();
  return await stub.fetch(new Request(`http://internal/update`, {
    method: 'POST',
    body: JSON.stringify(body),
  }));
});

router.get('/location', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  return await stub.fetch(new Request(`http://internal/location`));
});

router.get('/ws', async (c) => {
  const orderId = c.req.param('orderId');
  const id = c.env.DELIVERY_LOCATION_DO.idFromName(orderId);
  const stub = c.env.DELIVERY_LOCATION_DO.get(id);
  
  return await stub.fetch(c.req.raw);
});

export default router;

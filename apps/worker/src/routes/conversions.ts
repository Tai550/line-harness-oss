import { Hono } from "hono";
import { getConversionPoints, createConversionPoint, deleteConversionPoint, trackConversion, getConversionEvents, getConversionReport } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/conversions/points", async (c) => {
  const points = await getConversionPoints(c.env.DB);
  return c.json({ success: true, data: points });
});

app.post("/api/conversions/points", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; pointValue?: number }>();
  const point = await createConversionPoint(c.env.DB, body);
  return c.json({ success: true, data: point });
});

app.delete("/api/conversions/points/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteConversionPoint(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/conversions/track", async (c) => {
  const body = await c.req.json<{ friendId: number; conversionPointId: number; value?: number; metadata?: string }>();
  const event = await trackConversion(c.env.DB, body);
  return c.json({ success: true, data: event });
});

app.get("/api/conversions/events", async (c) => {
  const friendId = c.req.query("friendId") ? Number(c.req.query("friendId")) : undefined;
  const pointId = c.req.query("pointId") ? Number(c.req.query("pointId")) : undefined;
  const events = await getConversionEvents(c.env.DB, { friendId, pointId });
  return c.json({ success: true, data: events });
});

app.get("/api/conversions/report", async (c) => {
  const report = await getConversionReport(c.env.DB);
  return c.json({ success: true, data: report });
});

export default app;

import { Hono } from "hono";
import {
  getAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  getAutomationLogs,
} from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/automations", async (c) => {
  const automations = await getAutomations(c.env.DB);
  return c.json({ success: true, data: automations });
});

app.post("/api/automations", async (c) => {
  const body = await c.req.json<{ name: string; triggerEvent: string; conditions: string; actions: string; priority?: number }>();
  const automation = await createAutomation(c.env.DB, body);
  return c.json({ success: true, data: automation });
});

app.get("/api/automations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const automation = await getAutomationById(c.env.DB, id);
  if (!automation) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: automation });
});

app.put("/api/automations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateAutomation(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/automations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteAutomation(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/automations/:id/logs", async (c) => {
  const id = Number(c.req.param("id"));
  const logs = await getAutomationLogs(c.env.DB, id);
  return c.json({ success: true, data: logs });
});

export default app;

import { Hono } from "hono";
import {
  getNotificationRules, createNotificationRule, updateNotificationRule, deleteNotificationRule,
  getNotifications,
} from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/notification-rules", async (c) => {
  const rules = await getNotificationRules(c.env.DB);
  return c.json({ success: true, data: rules });
});

app.post("/api/notification-rules", async (c) => {
  const body = await c.req.json<{ name: string; triggerEvent: string; conditions?: string; channels: string; messageTemplate: string }>();
  const rule = await createNotificationRule(c.env.DB, body);
  return c.json({ success: true, data: rule });
});

app.put("/api/notification-rules/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateNotificationRule(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/notification-rules/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteNotificationRule(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/notifications", async (c) => {
  const status = c.req.query("status");
  const limit = Number(c.req.query("limit") ?? 50);
  const notifications = await getNotifications(c.env.DB, { status, limit });
  return c.json({ success: true, data: notifications });
});

export default app;

import { Hono } from "hono";
import {
  getIncomingWebhooks, createIncomingWebhook, deleteIncomingWebhook,
  getOutgoingWebhooks, createOutgoingWebhook, updateOutgoingWebhook, deleteOutgoingWebhook,
} from "@line-crm/db";
import { fireEvent } from "../services/event-bus";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string; API_KEY: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/webhooks/incoming", async (c) => {
  const webhooks = await getIncomingWebhooks(c.env.DB);
  return c.json({ success: true, data: webhooks });
});

app.post("/api/webhooks/incoming", async (c) => {
  const body = await c.req.json<{ name: string; secret?: string; eventTypes?: string }>();
  const webhook = await createIncomingWebhook(c.env.DB, body);
  return c.json({ success: true, data: webhook });
});

app.delete("/api/webhooks/incoming/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteIncomingWebhook(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/webhooks/incoming/:id/receive", async (c) => {
  const body = await c.req.json();
  c.executionCtx.waitUntil(fireEvent("incoming_webhook", body, c.env.DB, c.env));
  return c.json({ success: true });
});

app.get("/api/webhooks/outgoing", async (c) => {
  const webhooks = await getOutgoingWebhooks(c.env.DB);
  return c.json({ success: true, data: webhooks });
});

app.post("/api/webhooks/outgoing", async (c) => {
  const body = await c.req.json<{ name: string; url: string; secret?: string; eventTypes?: string; headers?: string }>();
  const webhook = await createOutgoingWebhook(c.env.DB, body);
  return c.json({ success: true, data: webhook });
});

app.put("/api/webhooks/outgoing/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateOutgoingWebhook(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/webhooks/outgoing/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteOutgoingWebhook(c.env.DB, id);
  return c.json({ success: true });
});

export default app;

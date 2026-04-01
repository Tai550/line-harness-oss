import { Hono } from "hono";
import {
  getBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
} from "@line-crm/db";
import { processBroadcastSend } from "../services/broadcast";
import { processSegmentSend } from "../services/segment-send";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string; API_KEY: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/broadcasts", async (c) => {
  const broadcasts = await getBroadcasts(c.env.DB);
  return c.json({ success: true, data: broadcasts });
});

app.post("/api/broadcasts", async (c) => {
  const body = await c.req.json<{
    title: string; messageType: string; messageContent: string;
    targetType: string; targetTagId?: number; targetConditions?: string; scheduledAt?: string;
  }>();
  const broadcast = await createBroadcast(c.env.DB, body);
  return c.json({ success: true, data: broadcast });
});

app.get("/api/broadcasts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const broadcast = await getBroadcastById(c.env.DB, id);
  if (!broadcast) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: broadcast });
});

app.put("/api/broadcasts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateBroadcast(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/broadcasts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteBroadcast(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/broadcasts/:id/send", async (c) => {
  const id = Number(c.req.param("id"));
  c.executionCtx.waitUntil(processBroadcastSend(c.env.DB, c.env, id));
  return c.json({ success: true, message: "送信を開始しました" });
});

app.post("/api/broadcasts/:id/send-segment", async (c) => {
  const id = Number(c.req.param("id"));
  const broadcast = await getBroadcastById(c.env.DB, id);
  if (!broadcast) return c.json({ success: false, error: "Not found" }, 404);
  const conditions = JSON.parse((broadcast as { target_conditions: string }).target_conditions ?? "[]");
  c.executionCtx.waitUntil(processSegmentSend(id, conditions, c.env.DB, c.env));
  return c.json({ success: true });
});

export default app;

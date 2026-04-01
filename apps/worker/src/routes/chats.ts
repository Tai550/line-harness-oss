import { Hono } from "hono";
import { getOperators, createOperator, deleteOperator, getChats, getChatById, updateChatStatus } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/operators", async (c) => {
  const operators = await getOperators(c.env.DB);
  return c.json({ success: true, data: operators });
});

app.post("/api/operators", async (c) => {
  const body = await c.req.json<{ name: string; email: string }>();
  const operator = await createOperator(c.env.DB, body);
  return c.json({ success: true, data: operator });
});

app.delete("/api/operators/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteOperator(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/chats", async (c) => {
  const status = c.req.query("status");
  const chats = await getChats(c.env.DB, { status });
  return c.json({ success: true, data: chats });
});

app.get("/api/chats/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const chat = await getChatById(c.env.DB, id);
  if (!chat) return c.json({ success: false, error: "Not found" }, 404);
  const messages = await c.env.DB.prepare("SELECT * FROM messages_log WHERE friend_id = ? ORDER BY created_at DESC LIMIT 50").bind((chat as { friend_id: number }).friend_id).all();
  return c.json({ success: true, data: { ...chat, messages: messages.results } });
});

app.put("/api/chats/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string }>();
  await updateChatStatus(c.env.DB, id, body.status);
  return c.json({ success: true });
});

app.post("/api/chats/:id/send", async (c) => {
  const id = Number(c.req.param("id"));
  const chat = await getChatById(c.env.DB, id);
  if (!chat) return c.json({ success: false, error: "Not found" }, 404);
  const body = await c.req.json<{ text: string }>();
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.pushTextMessage((chat as { line_user_id: string }).line_user_id, body.text);
  const now = new Date().toISOString();
  await c.env.DB.prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, created_at) VALUES (?, 'outbound', 'text', ?, ?)").bind((chat as { friend_id: number }).friend_id, body.text, now).run();
  await updateChatStatus(c.env.DB, id, "active");
  return c.json({ success: true });
});

export default app;

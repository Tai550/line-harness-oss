import { Hono } from "hono";
import { LineClient } from "@line-crm/line-sdk";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/rich-menus", async (c) => {
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  const result = await lineClient.getRichMenus();
  return c.json({ success: true, data: result.richmenus ?? [] });
});

app.post("/api/rich-menus", async (c) => {
  const body = await c.req.json();
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  const result = await lineClient.createRichMenu(body);
  return c.json({ success: true, data: result });
});

app.delete("/api/rich-menus/:id", async (c) => {
  const id = c.req.param("id");
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.deleteRichMenu(id);
  return c.json({ success: true });
});

app.post("/api/rich-menus/:id/default", async (c) => {
  const id = c.req.param("id");
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.setDefaultRichMenu(id);
  return c.json({ success: true });
});

app.post("/api/rich-menus/:id/image", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ imageData: string; contentType?: string }>();
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.uploadRichMenuImage(id, body.imageData, body.contentType);
  return c.json({ success: true });
});

app.post("/api/friends/:friendId/rich-menu/:richMenuId", async (c) => {
  const friendId = Number(c.req.param("friendId"));
  const richMenuId = c.req.param("richMenuId");
  const friend = await c.env.DB.prepare("SELECT line_user_id FROM friends WHERE id = ?").bind(friendId).first<{ line_user_id: string }>();
  if (!friend) return c.json({ success: false, error: "Not found" }, 404);
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.setRichMenuForUser(friend.line_user_id, richMenuId);
  return c.json({ success: true });
});

app.delete("/api/friends/:friendId/rich-menu", async (c) => {
  const friendId = Number(c.req.param("friendId"));
  const friend = await c.env.DB.prepare("SELECT line_user_id FROM friends WHERE id = ?").bind(friendId).first<{ line_user_id: string }>();
  if (!friend) return c.json({ success: false, error: "Not found" }, 404);
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  await lineClient.removeRichMenuFromUser(friend.line_user_id);
  return c.json({ success: true });
});

export default app;

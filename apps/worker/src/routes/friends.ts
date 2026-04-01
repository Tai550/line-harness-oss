import { Hono } from "hono";
import {
  getFriends,
  getFriendById,
  getFriendCount,
  getFriendTags,
  addTagToFriend,
  removeTagFromFriend,
  getScenarios,
  enrollFriendInScenario,
} from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import { fireEvent } from "../services/event-bus";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string; API_KEY: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/friends", async (c) => {
  const limit = Number(c.req.query("limit") ?? 20);
  const offset = Number(c.req.query("offset") ?? 0);
  const tagId = c.req.query("tagId") ? Number(c.req.query("tagId")) : undefined;
  const accountId = c.req.query("accountId") ? Number(c.req.query("accountId")) : undefined;
  const friends = await getFriends(c.env.DB, { limit, offset, tagId, accountId });
  const total = await getFriendCount(c.env.DB, accountId);
  return c.json({ success: true, data: friends, total, limit, offset });
});

app.get("/api/friends/count", async (c) => {
  const accountId = c.req.query("accountId") ? Number(c.req.query("accountId")) : undefined;
  const count = await getFriendCount(c.env.DB, accountId);
  return c.json({ success: true, data: { count } });
});

app.get("/api/friends/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const friend = await getFriendById(c.env.DB, id);
  if (!friend) return c.json({ success: false, error: "Not found" }, 404);
  const tags = await getFriendTags(c.env.DB, id);
  return c.json({ success: true, data: { ...friend, tags } });
});

app.post("/api/friends/:id/tags", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ tagId: number }>();
  await addTagToFriend(c.env.DB, id, body.tagId);
  // Check tag_added scenarios
  const scenarios = await getScenarios(c.env.DB);
  for (const scenario of scenarios as Array<{ id: number; trigger_type: string; trigger_tag_id: number | null; is_active: number }>) {
    if (scenario.trigger_type === "tag_added" && scenario.trigger_tag_id === body.tagId && scenario.is_active) {
      await enrollFriendInScenario(c.env.DB, id, scenario.id);
    }
  }
  await fireEvent("tag_change", { friendId: id, tagId: body.tagId, action: "add" }, c.env.DB, c.env);
  return c.json({ success: true });
});

app.delete("/api/friends/:id/tags/:tagId", async (c) => {
  const id = Number(c.req.param("id"));
  const tagId = Number(c.req.param("tagId"));
  await removeTagFromFriend(c.env.DB, id, tagId);
  await fireEvent("tag_change", { friendId: id, tagId, action: "remove" }, c.env.DB, c.env);
  return c.json({ success: true });
});

app.put("/api/friends/:id/metadata", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Record<string, unknown>>();
  const now = new Date().toISOString();
  await c.env.DB.prepare("UPDATE friends SET metadata = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(body), now, id).run();
  return c.json({ success: true });
});

app.post("/api/friends/:id/messages", async (c) => {
  const id = Number(c.req.param("id"));
  const friend = await getFriendById(c.env.DB, id);
  if (!friend) return c.json({ success: false, error: "Not found" }, 404);
  const body = await c.req.json<{ type: string; content: string }>();
  const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
  const lineUserId = (friend as { line_user_id: string }).line_user_id;
  if (body.type === "text") {
    await lineClient.pushTextMessage(lineUserId, body.content);
  } else if (body.type === "flex") {
    await lineClient.pushFlexMessage(lineUserId, "メッセージ", JSON.parse(body.content));
  } else {
    await lineClient.pushMessage(lineUserId, [{ type: body.type as "image", originalContentUrl: body.content, previewImageUrl: body.content }]);
  }
  const now = new Date().toISOString();
  await c.env.DB.prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, created_at) VALUES (?, 'outbound', ?, ?, ?)").bind(id, body.type, body.content, now).run();
  return c.json({ success: true });
});

export default app;

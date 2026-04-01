import { getBroadcastById, updateBroadcastStatus, getFriendsByTag } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import { addMessageVariation, calculateStaggerDelay } from "./stealth";
import type { OutboundMessage } from "@line-crm/line-sdk";
import { getScheduledBroadcastsDue } from "@line-crm/db";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

function buildMessage(type: string, content: string): OutboundMessage {
  if (type === "text") return { type: "text", text: content };
  if (type === "image") return { type: "image", originalContentUrl: content, previewImageUrl: content };
  if (type === "flex") return { type: "flex", altText: "メッセージ", contents: JSON.parse(content) };
  return { type: "text", text: content };
}

export async function processBroadcastSend(db: D1Database, env: Env, broadcastId: number) {
  const broadcast = await getBroadcastById(db, broadcastId);
  if (!broadcast) return;
  const b = broadcast as { id: number; message_type: string; message_content: string; target_type: string; target_tag_id: number | null };

  await updateBroadcastStatus(db, broadcastId, "sending");
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  let successCount = 0;
  let totalCount = 0;

  try {
    if (b.target_type === "all") {
      const msg = buildMessage(b.message_type, addMessageVariation(b.message_content));
      await lineClient.broadcast([msg]);
      const result = await db.prepare("SELECT COUNT(*) as count FROM friends WHERE is_following = 1").first<{ count: number }>();
      totalCount = result?.count ?? 0;
      successCount = totalCount;
    } else if (b.target_type === "tag" && b.target_tag_id) {
      const friends = await getFriendsByTag(db, b.target_tag_id);
      totalCount = friends.length;
      const batchSize = 500;
      for (let i = 0; i < friends.length; i += batchSize) {
        const batch = friends.slice(i, i + batchSize) as Array<{ line_user_id: string }>;
        const userIds = batch.map((f) => f.line_user_id);
        const msg = buildMessage(b.message_type, addMessageVariation(b.message_content));
        await lineClient.multicast(userIds, [msg]);
        successCount += batch.length;
        const delay = calculateStaggerDelay(i / batchSize, friends.length);
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      }
    }
    await updateBroadcastStatus(db, broadcastId, "sent", { totalCount, successCount });
  } catch (e) {
    await updateBroadcastStatus(db, broadcastId, "failed");
  }
}

export async function processScheduledBroadcasts(db: D1Database, env: Env) {
  const broadcasts = await getScheduledBroadcastsDue(db);
  for (const broadcast of broadcasts as Array<{ id: number }>) {
    await processBroadcastSend(db, env, broadcast.id);
  }
}

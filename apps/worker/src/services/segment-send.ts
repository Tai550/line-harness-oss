import { updateBroadcastStatus } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import { addMessageVariation, calculateStaggerDelay } from "./stealth";
import { getBroadcastById } from "@line-crm/db";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

interface SegmentCondition {
  logic: "AND" | "OR";
  rules: SegmentRule[];
}

function buildSegmentQuery(condition: SegmentCondition): { query: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses = condition.rules.map((rule) => {
    if (rule.field === "tag") {
      if (rule.operator === "has") {
        params.push(rule.value);
        return "EXISTS (SELECT 1 FROM friend_tags ft JOIN tags t ON t.id = ft.tag_id WHERE ft.friend_id = f.id AND t.name = ?)";
      } else {
        params.push(rule.value);
        return "NOT EXISTS (SELECT 1 FROM friend_tags ft JOIN tags t ON t.id = ft.tag_id WHERE ft.friend_id = f.id AND t.name = ?)";
      }
    } else if (rule.field === "is_following") {
      return `f.is_following = ${rule.value === "true" ? 1 : 0}`;
    }
    return "1=1";
  });
  const logic = condition.logic === "AND" ? " AND " : " OR ";
  return {
    query: `SELECT f.line_user_id FROM friends f WHERE ${clauses.join(logic)}`,
    params,
  };
}

export async function processSegmentSend(
  broadcastId: number,
  conditions: SegmentCondition[],
  db: D1Database,
  env: Env
) {
  const broadcast = await getBroadcastById(db, broadcastId);
  if (!broadcast) return;
  const b = broadcast as { message_type: string; message_content: string };

  await updateBroadcastStatus(db, broadcastId, "sending");
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);

  try {
    let userIds: string[] = [];
    for (const condition of conditions) {
      const { query, params } = buildSegmentQuery(condition);
      const result = await db.prepare(query).bind(...params).all<{ line_user_id: string }>();
      userIds = [...new Set([...userIds, ...result.results.map((r) => r.line_user_id)])];
    }

    const batchSize = 500;
    let successCount = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const msg = b.message_type === "text"
        ? { type: "text" as const, text: addMessageVariation(b.message_content) }
        : { type: "flex" as const, altText: "メッセージ", contents: JSON.parse(b.message_content) };
      await lineClient.multicast(batch, [msg]);
      successCount += batch.length;
      const delay = calculateStaggerDelay(i / batchSize, userIds.length);
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
    await updateBroadcastStatus(db, broadcastId, "sent", { totalCount: userIds.length, successCount });
  } catch (e) {
    await updateBroadcastStatus(db, broadcastId, "failed");
  }
}

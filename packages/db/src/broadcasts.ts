import { jstNow } from "./utils";

export async function getBroadcasts(db: D1Database, { limit = 20, offset = 0 } = {}) {
  const result = await db
    .prepare("SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all();
  return result.results;
}

export async function getBroadcastById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM broadcasts WHERE id = ?").bind(id).first();
}

export async function createBroadcast(db: D1Database, data: {
  title: string;
  messageType: string;
  messageContent: string;
  targetType: string;
  targetTagId?: number;
  targetConditions?: string;
  scheduledAt?: string;
}) {
  const now = jstNow();
  const status = data.scheduledAt ? "scheduled" : "draft";
  return db
    .prepare("INSERT INTO broadcasts (title, message_type, message_content, target_type, target_tag_id, target_conditions, status, scheduled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.title, data.messageType, data.messageContent, data.targetType, data.targetTagId ?? null, data.targetConditions ?? null, status, data.scheduledAt ?? null, now, now)
    .first();
}

export async function updateBroadcast(db: D1Database, id: number, data: Partial<{
  title: string;
  messageType: string;
  messageContent: string;
  targetType: string;
  scheduledAt: string;
  status: string;
}>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.title !== undefined) { sets.push("title = ?"); values.push(data.title); }
  if (data.messageType !== undefined) { sets.push("message_type = ?"); values.push(data.messageType); }
  if (data.messageContent !== undefined) { sets.push("message_content = ?"); values.push(data.messageContent); }
  if (data.targetType !== undefined) { sets.push("target_type = ?"); values.push(data.targetType); }
  if (data.scheduledAt !== undefined) { sets.push("scheduled_at = ?"); values.push(data.scheduledAt); }
  if (data.status !== undefined) { sets.push("status = ?"); values.push(data.status); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  if (sets.length === 1) return;
  await db.prepare(`UPDATE broadcasts SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteBroadcast(db: D1Database, id: number) {
  await db.prepare("DELETE FROM broadcasts WHERE id = ?").bind(id).run();
}

export async function updateBroadcastStatus(db: D1Database, id: number, status: string, stats?: { totalCount?: number; successCount?: number }) {
  const now = jstNow();
  if (stats) {
    await db
      .prepare("UPDATE broadcasts SET status = ?, total_count = ?, success_count = ?, sent_at = ?, updated_at = ? WHERE id = ?")
      .bind(status, stats.totalCount ?? 0, stats.successCount ?? 0, now, now, id)
      .run();
  } else {
    await db
      .prepare("UPDATE broadcasts SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, now, id)
      .run();
  }
}

export async function getScheduledBroadcastsDue(db: D1Database) {
  const now = new Date().toISOString();
  const result = await db
    .prepare("SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= ?")
    .bind(now)
    .all();
  return result.results;
}

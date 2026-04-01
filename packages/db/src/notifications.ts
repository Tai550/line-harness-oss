import { jstNow } from "./utils";

export async function getNotificationRules(db: D1Database) {
  const result = await db.prepare("SELECT * FROM notification_rules ORDER BY created_at DESC").all();
  return result.results;
}

export async function createNotificationRule(db: D1Database, data: {
  name: string; triggerEvent: string; conditions?: string; channels: string; messageTemplate: string;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO notification_rules (name, trigger_event, conditions, channels, message_template, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.triggerEvent, data.conditions ?? null, data.channels, data.messageTemplate, now, now)
    .first();
}

export async function updateNotificationRule(db: D1Database, id: number, data: Partial<{
  name: string; isActive: boolean; channels: string; messageTemplate: string;
}>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  if (data.channels !== undefined) { sets.push("channels = ?"); values.push(data.channels); }
  if (data.messageTemplate !== undefined) { sets.push("message_template = ?"); values.push(data.messageTemplate); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE notification_rules SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteNotificationRule(db: D1Database, id: number) {
  await db.prepare("DELETE FROM notification_rules WHERE id = ?").bind(id).run();
}

export async function getActiveNotificationRulesByEvent(db: D1Database, eventType: string) {
  const result = await db
    .prepare("SELECT * FROM notification_rules WHERE is_active = 1 AND trigger_event = ?")
    .bind(eventType)
    .all();
  return result.results;
}

export async function createNotification(db: D1Database, data: {
  ruleId?: number; channel: string; message: string; metadata?: string;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO notifications (rule_id, channel, message, status, metadata, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?) RETURNING *")
    .bind(data.ruleId ?? null, data.channel, data.message, data.metadata ?? null, now, now)
    .first();
}

export async function updateNotificationStatus(db: D1Database, id: number, status: string) {
  const now = jstNow();
  await db.prepare("UPDATE notifications SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
}

export async function getNotifications(db: D1Database, { limit = 50, offset = 0, status }: { limit?: number; offset?: number; status?: string } = {}) {
  if (status) {
    const result = await db
      .prepare("SELECT * FROM notifications WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(status, limit, offset)
      .all();
    return result.results;
  }
  const result = await db
    .prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all();
  return result.results;
}

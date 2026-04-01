import { jstNow } from "./utils";

export async function getIncomingWebhooks(db: D1Database) {
  const result = await db.prepare("SELECT * FROM webhooks_incoming ORDER BY created_at DESC").all();
  return result.results;
}

export async function createIncomingWebhook(db: D1Database, data: { name: string; secret?: string; eventTypes?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO webhooks_incoming (name, secret, event_types, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.secret ?? null, data.eventTypes ?? '[]', now, now)
    .first();
}

export async function deleteIncomingWebhook(db: D1Database, id: number) {
  await db.prepare("DELETE FROM webhooks_incoming WHERE id = ?").bind(id).run();
}

export async function getOutgoingWebhooks(db: D1Database) {
  const result = await db.prepare("SELECT * FROM webhooks_outgoing ORDER BY created_at DESC").all();
  return result.results;
}

export async function createOutgoingWebhook(db: D1Database, data: { name: string; url: string; secret?: string; eventTypes?: string; headers?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO webhooks_outgoing (name, url, secret, event_types, headers, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.url, data.secret ?? null, data.eventTypes ?? '[]', data.headers ?? '{}', now, now)
    .first();
}

export async function updateOutgoingWebhook(db: D1Database, id: number, data: Partial<{ name: string; url: string; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.url !== undefined) { sets.push("url = ?"); values.push(data.url); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE webhooks_outgoing SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteOutgoingWebhook(db: D1Database, id: number) {
  await db.prepare("DELETE FROM webhooks_outgoing WHERE id = ?").bind(id).run();
}

export async function getActiveOutgoingWebhooksByEvent(db: D1Database, eventType: string) {
  const result = await db
    .prepare("SELECT * FROM webhooks_outgoing WHERE is_active = 1 AND (event_types = '[]' OR event_types LIKE ?)")
    .bind(`%"${eventType}"%`)
    .all();
  return result.results;
}

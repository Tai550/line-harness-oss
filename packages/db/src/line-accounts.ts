import { jstNow } from "./utils";

export async function getLineAccounts(db: D1Database) {
  const result = await db
    .prepare("SELECT id, name, channel_id, is_active, created_at, updated_at FROM line_accounts ORDER BY created_at DESC")
    .all();
  return result.results;
}

export async function getLineAccountById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM line_accounts WHERE id = ?").bind(id).first();
}

export async function getLineAccountByChannelId(db: D1Database, channelId: string) {
  return db.prepare("SELECT * FROM line_accounts WHERE channel_id = ?").bind(channelId).first();
}

export async function createLineAccount(db: D1Database, data: { name: string; channelId: string; channelSecret: string; channelAccessToken: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO line_accounts (name, channel_id, channel_secret, channel_access_token, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.channelId, data.channelSecret, data.channelAccessToken, now, now)
    .first();
}

export async function updateLineAccount(db: D1Database, id: number, data: Partial<{ name: string; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE line_accounts SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteLineAccount(db: D1Database, id: number) {
  await db.prepare("DELETE FROM line_accounts WHERE id = ?").bind(id).run();
}

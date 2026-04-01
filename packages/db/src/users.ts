import { jstNow } from "./utils";

export async function getUsers(db: D1Database, { limit = 20, offset = 0 } = {}) {
  const result = await db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all();
  return result.results;
}

export async function getUserById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
}

export async function getUserByEmail(db: D1Database, email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
}

export async function getUserByPhone(db: D1Database, phone: string) {
  return db.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first();
}

export async function createUser(db: D1Database, data: { email?: string; phone?: string; name?: string; metadata?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO users (email, phone, name, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.email ?? null, data.phone ?? null, data.name ?? null, data.metadata ?? '{}', now, now)
    .first();
}

export async function updateUser(db: D1Database, id: number, data: Partial<{ email: string; phone: string; name: string; metadata: string }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.email !== undefined) { sets.push("email = ?"); values.push(data.email); }
  if (data.phone !== undefined) { sets.push("phone = ?"); values.push(data.phone); }
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.metadata !== undefined) { sets.push("metadata = ?"); values.push(data.metadata); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteUser(db: D1Database, id: number) {
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

export async function linkFriendToUser(db: D1Database, userId: number, friendId: number) {
  const now = jstNow();
  await db
    .prepare("INSERT OR IGNORE INTO user_line_links (user_id, friend_id, linked_at) VALUES (?, ?, ?)")
    .bind(userId, friendId, now)
    .run();
}

export async function unlinkFriendFromUser(db: D1Database, userId: number, friendId: number) {
  await db
    .prepare("DELETE FROM user_line_links WHERE user_id = ? AND friend_id = ?")
    .bind(userId, friendId)
    .run();
}

export async function getUserFriends(db: D1Database, userId: number) {
  const result = await db
    .prepare("SELECT f.* FROM friends f JOIN user_line_links ul ON ul.friend_id = f.id WHERE ul.user_id = ?")
    .bind(userId)
    .all();
  return result.results;
}

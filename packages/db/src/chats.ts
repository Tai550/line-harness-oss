import { jstNow } from "./utils";

export async function getOperators(db: D1Database) {
  const result = await db.prepare("SELECT * FROM operators WHERE is_active = 1 ORDER BY name ASC").all();
  return result.results;
}

export async function createOperator(db: D1Database, data: { name: string; email: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO operators (name, email, is_active, created_at) VALUES (?, ?, 1, ?) RETURNING *")
    .bind(data.name, data.email, now)
    .first();
}

export async function deleteOperator(db: D1Database, id: number) {
  await db.prepare("UPDATE operators SET is_active = 0 WHERE id = ?").bind(id).run();
}

export async function getChats(db: D1Database, { status, limit = 50, offset = 0 }: { status?: string; limit?: number; offset?: number } = {}) {
  if (status) {
    const result = await db
      .prepare("SELECT c.*, f.display_name as friend_name, f.picture_url FROM chats c JOIN friends f ON f.id = c.friend_id WHERE c.status = ? ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?")
      .bind(status, limit, offset)
      .all();
    return result.results;
  }
  const result = await db
    .prepare("SELECT c.*, f.display_name as friend_name, f.picture_url FROM chats c JOIN friends f ON f.id = c.friend_id ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all();
  return result.results;
}

export async function getChatById(db: D1Database, id: number) {
  return db.prepare("SELECT c.*, f.display_name as friend_name, f.line_user_id FROM chats c JOIN friends f ON f.id = c.friend_id WHERE c.id = ?").bind(id).first();
}

export async function upsertChatOnMessage(db: D1Database, friendId: number) {
  const now = jstNow();
  const existing = await db.prepare("SELECT id, status FROM chats WHERE friend_id = ?").bind(friendId).first<{ id: number; status: string }>();
  if (existing) {
    const newStatus = existing.status === 'resolved' ? 'unread' : existing.status;
    await db.prepare("UPDATE chats SET status = ?, last_message_at = ?, updated_at = ? WHERE id = ?").bind(newStatus, now, now, existing.id).run();
  } else {
    await db.prepare("INSERT INTO chats (friend_id, status, last_message_at, created_at, updated_at) VALUES (?, 'unread', ?, ?, ?)").bind(friendId, now, now, now).run();
  }
}

export async function updateChatStatus(db: D1Database, id: number, status: string) {
  const now = jstNow();
  await db.prepare("UPDATE chats SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
}

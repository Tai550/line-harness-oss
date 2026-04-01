import { jstNow } from "./utils";

export async function getTags(db: D1Database) {
  const result = await db.prepare("SELECT * FROM tags ORDER BY name ASC").all();
  return result.results;
}

export async function createTag(db: D1Database, name: string, color = "#3B82F6") {
  const now = jstNow();
  const result = await db
    .prepare("INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?) RETURNING *")
    .bind(name, color, now)
    .first();
  return result;
}

export async function deleteTag(db: D1Database, id: number) {
  await db.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
}

export async function addTagToFriend(db: D1Database, friendId: number, tagId: number) {
  const now = jstNow();
  await db
    .prepare("INSERT OR IGNORE INTO friend_tags (friend_id, tag_id, assigned_at) VALUES (?, ?, ?)")
    .bind(friendId, tagId, now)
    .run();
}

export async function removeTagFromFriend(db: D1Database, friendId: number, tagId: number) {
  await db.prepare("DELETE FROM friend_tags WHERE friend_id = ? AND tag_id = ?").bind(friendId, tagId).run();
}

export async function getFriendTags(db: D1Database, friendId: number) {
  const result = await db
    .prepare("SELECT t.* FROM tags t JOIN friend_tags ft ON ft.tag_id = t.id WHERE ft.friend_id = ?")
    .bind(friendId)
    .all();
  return result.results;
}

export async function getFriendsByTag(db: D1Database, tagId: number) {
  const result = await db
    .prepare("SELECT f.* FROM friends f JOIN friend_tags ft ON ft.friend_id = f.id WHERE ft.tag_id = ?")
    .bind(tagId)
    .all();
  return result.results;
}

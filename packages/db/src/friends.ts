import { jstNow } from "./utils";

export async function getFriends(
  db: D1Database,
  { limit = 20, offset = 0, tagId, accountId }: { limit?: number; offset?: number; tagId?: number; accountId?: number } = {}
) {
  if (tagId) {
    const sql = accountId
      ? `SELECT f.* FROM friends f JOIN friend_tags ft ON ft.friend_id = f.id WHERE ft.tag_id = ? AND f.account_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
      : `SELECT f.* FROM friends f JOIN friend_tags ft ON ft.friend_id = f.id WHERE ft.tag_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    const result = accountId
      ? await db.prepare(sql).bind(tagId, accountId, limit, offset).all()
      : await db.prepare(sql).bind(tagId, limit, offset).all();
    return result.results;
  }
  if (accountId) {
    const result = await db
      .prepare("SELECT * FROM friends WHERE account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(accountId, limit, offset)
      .all();
    return result.results;
  }
  const result = await db
    .prepare("SELECT * FROM friends ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(limit, offset)
    .all();
  return result.results;
}

export async function getFriendByLineUserId(db: D1Database, lineUserId: string) {
  return db.prepare("SELECT * FROM friends WHERE line_user_id = ?").bind(lineUserId).first();
}

export async function getFriendById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM friends WHERE id = ?").bind(id).first();
}

export async function upsertFriend(
  db: D1Database,
  data: {
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    refCode?: string;
    accountId?: number;
  }
) {
  const now = jstNow();
  await db
    .prepare(
      `INSERT INTO friends (line_user_id, display_name, picture_url, status_message, is_following, ref_code, account_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
       ON CONFLICT(line_user_id) DO UPDATE SET
         display_name = excluded.display_name,
         picture_url = excluded.picture_url,
         status_message = excluded.status_message,
         is_following = 1,
         account_id = COALESCE(excluded.account_id, friends.account_id),
         updated_at = excluded.updated_at`
    )
    .bind(data.lineUserId, data.displayName, data.pictureUrl ?? null, data.statusMessage ?? null, data.refCode ?? null, data.accountId ?? null, now, now)
    .run();
  return getFriendByLineUserId(db, data.lineUserId);
}

export async function updateFriendFollowStatus(db: D1Database, lineUserId: string, isFollowing: boolean) {
  const now = jstNow();
  await db
    .prepare("UPDATE friends SET is_following = ?, updated_at = ? WHERE line_user_id = ?")
    .bind(isFollowing ? 1 : 0, now, lineUserId)
    .run();
}

export async function getFriendCount(db: D1Database, accountId?: number): Promise<number> {
  if (accountId) {
    const result = await db.prepare("SELECT COUNT(*) as count FROM friends WHERE account_id = ?").bind(accountId).first<{ count: number }>();
    return result?.count ?? 0;
  }
  const result = await db.prepare("SELECT COUNT(*) as count FROM friends").first<{ count: number }>();
  return result?.count ?? 0;
}

import { jstNow } from "./utils";

export async function getTrackedLinks(db: D1Database) {
  const result = await db.prepare("SELECT * FROM tracked_links ORDER BY created_at DESC").all();
  return result.results;
}

export async function getTrackedLinkById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM tracked_links WHERE id = ?").bind(id).first();
}

export async function createTrackedLink(db: D1Database, data: { name: string; destinationUrl: string; tagIds?: string; scenarioId?: number }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO tracked_links (name, destination_url, tag_ids, scenario_id, click_count, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 1, ?, ?) RETURNING *")
    .bind(data.name, data.destinationUrl, data.tagIds ?? '[]', data.scenarioId ?? null, now, now)
    .first();
}

export async function deleteTrackedLink(db: D1Database, id: number) {
  await db.prepare("DELETE FROM tracked_links WHERE id = ?").bind(id).run();
}

export async function recordLinkClick(db: D1Database, linkId: number, friendId?: number, ipAddress?: string, userAgent?: string) {
  const now = jstNow();
  await db.prepare("UPDATE tracked_links SET click_count = click_count + 1 WHERE id = ?").bind(linkId).run();
  await db
    .prepare("INSERT INTO link_clicks (link_id, friend_id, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(linkId, friendId ?? null, ipAddress ?? null, userAgent ?? null, now)
    .run();
}

export async function getLinkClicks(db: D1Database, linkId: number) {
  const result = await db
    .prepare("SELECT lc.*, f.display_name FROM link_clicks lc LEFT JOIN friends f ON f.id = lc.friend_id WHERE lc.link_id = ? ORDER BY lc.created_at DESC LIMIT 100")
    .bind(linkId)
    .all();
  return result.results;
}

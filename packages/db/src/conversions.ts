import { jstNow } from "./utils";

export async function getConversionPoints(db: D1Database) {
  const result = await db.prepare("SELECT * FROM conversion_points ORDER BY created_at DESC").all();
  return result.results;
}

export async function createConversionPoint(db: D1Database, data: { name: string; description?: string; pointValue?: number }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO conversion_points (name, description, point_value, created_at) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(data.name, data.description ?? null, data.pointValue ?? 0, now)
    .first();
}

export async function deleteConversionPoint(db: D1Database, id: number) {
  await db.prepare("DELETE FROM conversion_points WHERE id = ?").bind(id).run();
}

export async function trackConversion(db: D1Database, data: { friendId: number; conversionPointId: number; value?: number; metadata?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO conversion_events (friend_id, conversion_point_id, value, metadata, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *")
    .bind(data.friendId, data.conversionPointId, data.value ?? 0, data.metadata ?? null, now)
    .first();
}

export async function getConversionEvents(db: D1Database, { limit = 50, offset = 0, friendId, pointId }: { limit?: number; offset?: number; friendId?: number; pointId?: number } = {}) {
  let query = "SELECT * FROM conversion_events WHERE 1=1";
  const values: unknown[] = [];
  if (friendId) { query += " AND friend_id = ?"; values.push(friendId); }
  if (pointId) { query += " AND conversion_point_id = ?"; values.push(pointId); }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  values.push(limit, offset);
  const result = await db.prepare(query).bind(...values).all();
  return result.results;
}

export async function getConversionReport(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT cp.name, COUNT(ce.id) as count, SUM(ce.value) as total_value
       FROM conversion_points cp
       LEFT JOIN conversion_events ce ON ce.conversion_point_id = cp.id
       GROUP BY cp.id, cp.name`
    )
    .all();
  return result.results;
}

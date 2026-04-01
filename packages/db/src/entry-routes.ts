import { jstNow } from "./utils";

export interface EntryRoute {
  id: number;
  name: string;
  ref_code: string;
  scenario_id: number | null;
  tag_ids: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface RefTracking {
  id: number;
  friend_id: number;
  ref_code: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}

export async function getEntryRoutes(db: D1Database) {
  const result = await db.prepare("SELECT * FROM entry_routes ORDER BY created_at DESC").all();
  return result.results as unknown as EntryRoute[];
}

export async function getEntryRouteByRefCode(db: D1Database, refCode: string) {
  return db.prepare("SELECT * FROM entry_routes WHERE ref_code = ? AND is_active = 1").bind(refCode).first<EntryRoute>();
}

export async function createEntryRoute(db: D1Database, data: { name: string; refCode: string; scenarioId?: number; tagIds?: string; description?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO entry_routes (name, ref_code, scenario_id, tag_ids, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.refCode, data.scenarioId ?? null, data.tagIds ?? '[]', data.description ?? null, now, now)
    .first<EntryRoute>();
}

export async function deleteEntryRoute(db: D1Database, id: number) {
  await db.prepare("DELETE FROM entry_routes WHERE id = ?").bind(id).run();
}

export async function recordRefTracking(db: D1Database, data: {
  friendId: number; refCode: string; source?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string;
}) {
  const now = jstNow();
  await db
    .prepare("INSERT INTO ref_tracking (friend_id, ref_code, source, utm_source, utm_medium, utm_campaign, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(data.friendId, data.refCode, data.source ?? null, data.utmSource ?? null, data.utmMedium ?? null, data.utmCampaign ?? null, now)
    .run();
}

export async function getRefTrackingStats(db: D1Database, refCode: string) {
  const result = await db
    .prepare("SELECT COUNT(*) as count, utm_source, utm_medium FROM ref_tracking WHERE ref_code = ? GROUP BY utm_source, utm_medium")
    .bind(refCode)
    .all();
  return result.results;
}

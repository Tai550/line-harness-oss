import { jstNow } from "./utils";

export async function getScoringRules(db: D1Database) {
  const result = await db.prepare("SELECT * FROM scoring_rules ORDER BY created_at DESC").all();
  return result.results;
}

export async function createScoringRule(db: D1Database, data: {
  name: string; eventType: string; condition?: string; scoreDelta: number;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO scoring_rules (name, event_type, condition, score_delta, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.eventType, data.condition ?? null, data.scoreDelta, now, now)
    .first();
}

export async function updateScoringRule(db: D1Database, id: number, data: Partial<{ name: string; scoreDelta: number; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.scoreDelta !== undefined) { sets.push("score_delta = ?"); values.push(data.scoreDelta); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE scoring_rules SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteScoringRule(db: D1Database, id: number) {
  await db.prepare("DELETE FROM scoring_rules WHERE id = ?").bind(id).run();
}

export async function getActiveRulesByEvent(db: D1Database, eventType: string) {
  const result = await db
    .prepare("SELECT * FROM scoring_rules WHERE is_active = 1 AND event_type = ?")
    .bind(eventType)
    .all();
  return result.results;
}

export async function addScore(db: D1Database, friendId: number, delta: number, ruleId?: number, reason?: string) {
  const now = jstNow();
  await db.prepare("INSERT INTO friend_scores (friend_id, rule_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)").bind(friendId, ruleId ?? null, delta, reason ?? null, now).run();
  await db.prepare("UPDATE friends SET score = score + ? WHERE id = ?").bind(delta, friendId).run();
}

export async function getFriendScore(db: D1Database, friendId: number) {
  return db.prepare("SELECT score FROM friends WHERE id = ?").bind(friendId).first<{ score: number }>();
}

export async function getFriendScoreHistory(db: D1Database, friendId: number) {
  const result = await db.prepare("SELECT * FROM friend_scores WHERE friend_id = ? ORDER BY created_at DESC LIMIT 50").bind(friendId).all();
  return result.results;
}

export async function applyScoring(db: D1Database, eventType: string, friendId: number) {
  const rules = await getActiveRulesByEvent(db, eventType);
  for (const rule of rules as Array<{ id: number; score_delta: number; name: string }>) {
    await addScore(db, friendId, rule.score_delta, rule.id, rule.name);
  }
}

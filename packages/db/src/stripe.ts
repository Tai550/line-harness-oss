import { jstNow } from "./utils";

export async function getStripeEvents(db: D1Database, { limit = 50 } = {}) {
  const result = await db.prepare("SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT ?").bind(limit).all();
  return result.results;
}

export async function getStripeEventByStripeId(db: D1Database, stripeEventId: string) {
  return db.prepare("SELECT * FROM stripe_events WHERE stripe_event_id = ?").bind(stripeEventId).first();
}

export async function createStripeEvent(db: D1Database, data: { stripeEventId: string; type: string; data: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO stripe_events (stripe_event_id, type, data, created_at) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(data.stripeEventId, data.type, data.data, now)
    .first();
}

import { jstNow } from "./utils";

export async function getAffiliates(db: D1Database) {
  const result = await db.prepare("SELECT * FROM affiliates ORDER BY created_at DESC").all();
  return result.results;
}

export async function getAffiliateById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM affiliates WHERE id = ?").bind(id).first();
}

export async function createAffiliate(db: D1Database, data: { name: string; refCode: string; commissionRate?: number }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO affiliates (name, ref_code, commission_rate, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.refCode, data.commissionRate ?? 0, now, now)
    .first();
}

export async function updateAffiliate(db: D1Database, id: number, data: Partial<{ name: string; commissionRate: number; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.commissionRate !== undefined) { sets.push("commission_rate = ?"); values.push(data.commissionRate); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE affiliates SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteAffiliate(db: D1Database, id: number) {
  await db.prepare("DELETE FROM affiliates WHERE id = ?").bind(id).run();
}

export async function recordAffiliateClick(db: D1Database, affiliateId: number, friendId?: number, ipAddress?: string, userAgent?: string) {
  const now = jstNow();
  await db
    .prepare("INSERT INTO affiliate_clicks (affiliate_id, friend_id, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(affiliateId, friendId ?? null, ipAddress ?? null, userAgent ?? null, now)
    .run();
}

export async function getAffiliateReport(db: D1Database, affiliateId: number) {
  const clicks = await db
    .prepare("SELECT COUNT(*) as count FROM affiliate_clicks WHERE affiliate_id = ?")
    .bind(affiliateId)
    .first<{ count: number }>();
  const conversions = await db
    .prepare(
      `SELECT COUNT(*) as count, SUM(ce.value) as total_value
       FROM conversion_events ce
       JOIN friends f ON f.id = ce.friend_id
       JOIN affiliate_clicks ac ON ac.friend_id = f.id
       WHERE ac.affiliate_id = ?`
    )
    .bind(affiliateId)
    .first<{ count: number; total_value: number }>();
  return {
    totalClicks: clicks?.count ?? 0,
    totalConversions: conversions?.count ?? 0,
    totalValue: conversions?.total_value ?? 0,
  };
}

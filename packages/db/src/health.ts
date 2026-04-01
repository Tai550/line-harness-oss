import { jstNow } from "./utils";

export async function getAccountHealthLogs(db: D1Database, accountId: number) {
  const result = await db
    .prepare("SELECT * FROM account_health_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT 100")
    .bind(accountId)
    .all();
  return result.results;
}

export async function createAccountHealthLog(db: D1Database, data: { accountId: number; riskLevel: string; messageCount?: number; details?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO account_health_logs (account_id, risk_level, message_count, details, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *")
    .bind(data.accountId, data.riskLevel, data.messageCount ?? null, data.details ?? null, now)
    .first();
}

export async function getLatestRiskLevel(db: D1Database, accountId: number): Promise<string> {
  const result = await db
    .prepare("SELECT risk_level FROM account_health_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(accountId)
    .first<{ risk_level: string }>();
  return result?.risk_level ?? "normal";
}

export async function getMigrations(db: D1Database) {
  const result = await db.prepare("SELECT * FROM account_migrations ORDER BY created_at DESC").all();
  return result.results;
}

export async function getMigrationById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM account_migrations WHERE id = ?").bind(id).first();
}

export async function createMigration(db: D1Database, data: { fromAccountId: number; toAccountId: number; totalFriends?: number }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO account_migrations (from_account_id, to_account_id, status, total_friends, created_at) VALUES (?, ?, 'pending', ?, ?) RETURNING *")
    .bind(data.fromAccountId, data.toAccountId, data.totalFriends ?? null, now)
    .first();
}

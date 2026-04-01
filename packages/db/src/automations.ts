import { jstNow } from "./utils";

export interface AutomationRow {
  id: number;
  name: string;
  trigger_event: string;
  conditions: string;
  actions: string;
  is_active: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationLogRow {
  id: number;
  automation_id: number;
  friend_id: number | null;
  trigger_event: string;
  actions_executed: string;
  status: string;
  error: string | null;
  created_at: string;
}

export async function getAutomations(db: D1Database) {
  const result = await db.prepare("SELECT * FROM automations ORDER BY priority DESC, created_at DESC").all();
  return result.results as unknown as AutomationRow[];
}

export async function getAutomationById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM automations WHERE id = ?").bind(id).first<AutomationRow>();
}

export async function createAutomation(db: D1Database, data: {
  name: string;
  triggerEvent: string;
  conditions: string;
  actions: string;
  priority?: number;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO automations (name, trigger_event, conditions, actions, is_active, priority, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?) RETURNING *")
    .bind(data.name, data.triggerEvent, data.conditions, data.actions, data.priority ?? 0, now, now)
    .first<AutomationRow>();
}

export async function updateAutomation(db: D1Database, id: number, data: Partial<{
  name: string; triggerEvent: string; conditions: string; actions: string; isActive: boolean; priority: number;
}>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.triggerEvent !== undefined) { sets.push("trigger_event = ?"); values.push(data.triggerEvent); }
  if (data.conditions !== undefined) { sets.push("conditions = ?"); values.push(data.conditions); }
  if (data.actions !== undefined) { sets.push("actions = ?"); values.push(data.actions); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  if (data.priority !== undefined) { sets.push("priority = ?"); values.push(data.priority); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE automations SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteAutomation(db: D1Database, id: number) {
  await db.prepare("DELETE FROM automations WHERE id = ?").bind(id).run();
}

export async function getActiveAutomationsByEvent(db: D1Database, eventType: string) {
  const result = await db
    .prepare("SELECT * FROM automations WHERE is_active = 1 AND trigger_event = ? ORDER BY priority DESC")
    .bind(eventType)
    .all();
  return result.results as unknown as AutomationRow[];
}

export async function createAutomationLog(db: D1Database, data: {
  automationId: number;
  friendId?: number;
  triggerEvent: string;
  actionsExecuted: string;
  status: string;
  error?: string;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO automation_logs (automation_id, friend_id, trigger_event, actions_executed, status, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.automationId, data.friendId ?? null, data.triggerEvent, data.actionsExecuted, data.status, data.error ?? null, now)
    .first<AutomationLogRow>();
}

export async function getAutomationLogs(db: D1Database, automationId: number, { limit = 50, offset = 0 } = {}) {
  const result = await db
    .prepare("SELECT * FROM automation_logs WHERE automation_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .bind(automationId, limit, offset)
    .all();
  return result.results;
}

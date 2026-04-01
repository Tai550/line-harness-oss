import { jstNow } from "./utils";

export async function getScenarios(db: D1Database) {
  const result = await db.prepare("SELECT * FROM scenarios ORDER BY created_at DESC").all();
  return result.results;
}

export async function getScenarioById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM scenarios WHERE id = ?").bind(id).first();
}

export async function createScenario(db: D1Database, data: {
  name: string;
  description?: string;
  triggerType: string;
  triggerTagId?: number;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO scenarios (name, description, trigger_type, trigger_tag_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.description ?? null, data.triggerType, data.triggerTagId ?? null, now, now)
    .first();
}

export async function updateScenario(db: D1Database, id: number, data: Partial<{
  name: string;
  description: string;
  triggerType: string;
  isActive: boolean;
}>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
  if (data.triggerType !== undefined) { sets.push("trigger_type = ?"); values.push(data.triggerType); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE scenarios SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteScenario(db: D1Database, id: number) {
  await db.prepare("DELETE FROM scenarios WHERE id = ?").bind(id).run();
}

export async function getScenarioSteps(db: D1Database, scenarioId: number) {
  const result = await db
    .prepare("SELECT * FROM scenario_steps WHERE scenario_id = ? ORDER BY step_order ASC")
    .bind(scenarioId)
    .all();
  return result.results;
}

export async function createScenarioStep(db: D1Database, data: {
  scenarioId: number;
  stepOrder: number;
  delayMinutes: number;
  messageType: string;
  messageContent: string;
  conditionType?: string;
  conditionValue?: string;
  nextStepOnFalse?: number;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO scenario_steps (scenario_id, step_order, delay_minutes, message_type, message_content, condition_type, condition_value, next_step_on_false, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.scenarioId, data.stepOrder, data.delayMinutes, data.messageType, data.messageContent, data.conditionType ?? null, data.conditionValue ?? null, data.nextStepOnFalse ?? null, now)
    .first();
}

export async function updateScenarioStep(db: D1Database, id: number, data: Partial<{
  stepOrder: number;
  delayMinutes: number;
  messageType: string;
  messageContent: string;
  conditionType: string;
  conditionValue: string;
  nextStepOnFalse: number;
}>) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.stepOrder !== undefined) { sets.push("step_order = ?"); values.push(data.stepOrder); }
  if (data.delayMinutes !== undefined) { sets.push("delay_minutes = ?"); values.push(data.delayMinutes); }
  if (data.messageType !== undefined) { sets.push("message_type = ?"); values.push(data.messageType); }
  if (data.messageContent !== undefined) { sets.push("message_content = ?"); values.push(data.messageContent); }
  if (data.conditionType !== undefined) { sets.push("condition_type = ?"); values.push(data.conditionType); }
  if (data.conditionValue !== undefined) { sets.push("condition_value = ?"); values.push(data.conditionValue); }
  if (data.nextStepOnFalse !== undefined) { sets.push("next_step_on_false = ?"); values.push(data.nextStepOnFalse); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE scenario_steps SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteScenarioStep(db: D1Database, id: number) {
  await db.prepare("DELETE FROM scenario_steps WHERE id = ?").bind(id).run();
}

export async function enrollFriendInScenario(db: D1Database, friendId: number, scenarioId: number) {
  const now = jstNow();
  const firstStep = await db
    .prepare("SELECT * FROM scenario_steps WHERE scenario_id = ? ORDER BY step_order ASC LIMIT 1")
    .bind(scenarioId)
    .first<{ delay_minutes: number }>();

  const nextDeliveryAt = firstStep
    ? new Date(new Date().getTime() + firstStep.delay_minutes * 60 * 1000).toISOString()
    : null;

  await db
    .prepare("INSERT INTO friend_scenarios (friend_id, scenario_id, current_step, status, next_delivery_at, started_at) VALUES (?, ?, 0, 'active', ?, ?)")
    .bind(friendId, scenarioId, nextDeliveryAt, now)
    .run();
}

export async function getFriendScenariosDueForDelivery(db: D1Database) {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `SELECT fs.*, s.name as scenario_name FROM friend_scenarios fs
       JOIN scenarios s ON s.id = fs.scenario_id
       WHERE fs.status = 'active' AND fs.next_delivery_at <= ?
       LIMIT 100`
    )
    .bind(now)
    .all();
  return result.results;
}

export async function advanceFriendScenario(db: D1Database, friendScenarioId: number, nextStepOrder: number, nextDeliveryAt: string | null) {
  await db
    .prepare("UPDATE friend_scenarios SET current_step = ?, next_delivery_at = ? WHERE id = ?")
    .bind(nextStepOrder, nextDeliveryAt, friendScenarioId)
    .run();
}

export async function completeFriendScenario(db: D1Database, friendScenarioId: number) {
  const now = jstNow();
  await db
    .prepare("UPDATE friend_scenarios SET status = 'completed', completed_at = ? WHERE id = ?")
    .bind(now, friendScenarioId)
    .run();
}

import { jstNow } from "./utils";

export async function getReminders(db: D1Database) {
  const result = await db.prepare("SELECT * FROM reminders ORDER BY created_at DESC").all();
  return result.results;
}

export async function getReminderById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM reminders WHERE id = ?").bind(id).first();
}

export async function createReminder(db: D1Database, data: { name: string; description?: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO reminders (name, description, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.description ?? null, now, now)
    .first();
}

export async function updateReminder(db: D1Database, id: number, data: Partial<{ name: string; description: string; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE reminders SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteReminder(db: D1Database, id: number) {
  await db.prepare("DELETE FROM reminders WHERE id = ?").bind(id).run();
}

export async function getReminderSteps(db: D1Database, reminderId: number) {
  const result = await db.prepare("SELECT * FROM reminder_steps WHERE reminder_id = ? ORDER BY step_order ASC").bind(reminderId).all();
  return result.results;
}

export async function createReminderStep(db: D1Database, data: {
  reminderId: number; stepOrder: number; offsetMinutes: number; messageType: string; messageContent: string;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO reminder_steps (reminder_id, step_order, offset_minutes, message_type, message_content, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.reminderId, data.stepOrder, data.offsetMinutes, data.messageType, data.messageContent, now)
    .first();
}

export async function updateReminderStep(db: D1Database, id: number, data: Partial<{ offsetMinutes: number; messageContent: string }>) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.offsetMinutes !== undefined) { sets.push("offset_minutes = ?"); values.push(data.offsetMinutes); }
  if (data.messageContent !== undefined) { sets.push("message_content = ?"); values.push(data.messageContent); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE reminder_steps SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteReminderStep(db: D1Database, id: number) {
  await db.prepare("DELETE FROM reminder_steps WHERE id = ?").bind(id).run();
}

export async function enrollFriendInReminder(db: D1Database, friendId: number, reminderId: number, targetDate: string) {
  const now = jstNow();
  const result = await db
    .prepare("INSERT INTO friend_reminders (friend_id, reminder_id, target_date, status, started_at) VALUES (?, ?, ?, 'active', ?) RETURNING *")
    .bind(friendId, reminderId, targetDate, now)
    .first<{ id: number }>();

  if (!result) return;

  const steps = await getReminderSteps(db, reminderId);
  for (const step of steps as Array<{ id: number; offset_minutes: number }>) {
    const scheduledAt = new Date(new Date(targetDate).getTime() + step.offset_minutes * 60 * 1000).toISOString();
    await db
      .prepare("INSERT INTO friend_reminder_steps (friend_reminder_id, reminder_step_id, scheduled_at, status) VALUES (?, ?, ?, 'pending')")
      .bind(result.id, step.id, scheduledAt)
      .run();
  }
  return result;
}

export async function getDueReminderDeliveries(db: D1Database) {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `SELECT frs.*, rs.message_type, rs.message_content, fr.friend_id, f.line_user_id, f.is_following
       FROM friend_reminder_steps frs
       JOIN friend_reminders fr ON fr.id = frs.friend_reminder_id
       JOIN reminder_steps rs ON rs.id = frs.reminder_step_id
       JOIN friends f ON f.id = fr.friend_id
       WHERE frs.status = 'pending' AND frs.scheduled_at <= ? AND fr.status = 'active'
       LIMIT 50`
    )
    .bind(now)
    .all();
  return result.results;
}

export async function markReminderStepDelivered(db: D1Database, stepId: number) {
  const now = jstNow();
  await db.prepare("UPDATE friend_reminder_steps SET status = 'delivered', delivered_at = ? WHERE id = ?").bind(now, stepId).run();
}

export async function completeReminderIfDone(db: D1Database, friendReminderId: number) {
  const pending = await db
    .prepare("SELECT COUNT(*) as count FROM friend_reminder_steps WHERE friend_reminder_id = ? AND status = 'pending'")
    .bind(friendReminderId)
    .first<{ count: number }>();
  if (pending && pending.count === 0) {
    const now = jstNow();
    await db.prepare("UPDATE friend_reminders SET status = 'completed', completed_at = ? WHERE id = ?").bind(now, friendReminderId).run();
  }
}

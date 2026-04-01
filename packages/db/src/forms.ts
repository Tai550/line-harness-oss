import { jstNow } from "./utils";

export async function getForms(db: D1Database) {
  const result = await db.prepare("SELECT * FROM forms ORDER BY created_at DESC").all();
  return result.results;
}

export async function getFormById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM forms WHERE id = ?").bind(id).first();
}

export async function createForm(db: D1Database, data: { name: string; description?: string; fields?: string; tagIds?: string; scenarioId?: number }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO forms (name, description, fields, tag_ids, scenario_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.description ?? null, data.fields ?? '[]', data.tagIds ?? '[]', data.scenarioId ?? null, now, now)
    .first();
}

export async function updateForm(db: D1Database, id: number, data: Partial<{ name: string; description: string; fields: string; isActive: boolean }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.description !== undefined) { sets.push("description = ?"); values.push(data.description); }
  if (data.fields !== undefined) { sets.push("fields = ?"); values.push(data.fields); }
  if (data.isActive !== undefined) { sets.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE forms SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteForm(db: D1Database, id: number) {
  await db.prepare("DELETE FROM forms WHERE id = ?").bind(id).run();
}

export async function createFormSubmission(db: D1Database, formId: number, friendId: number | null, data: string) {
  const now = jstNow();
  await db.prepare("UPDATE forms SET submit_count = submit_count + 1 WHERE id = ?").bind(formId).run();
  return db
    .prepare("INSERT INTO form_submissions (form_id, friend_id, data, submitted_at) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(formId, friendId, data, now)
    .first();
}

export async function getFormSubmissions(db: D1Database, formId: number) {
  const result = await db
    .prepare("SELECT fs.*, f.display_name FROM form_submissions fs LEFT JOIN friends f ON f.id = fs.friend_id WHERE fs.form_id = ? ORDER BY fs.submitted_at DESC")
    .bind(formId)
    .all();
  return result.results;
}

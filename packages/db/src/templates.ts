import { jstNow } from "./utils";

export async function getTemplates(db: D1Database, category?: string) {
  if (category) {
    const result = await db.prepare("SELECT * FROM templates WHERE category = ? ORDER BY created_at DESC").bind(category).all();
    return result.results;
  }
  const result = await db.prepare("SELECT * FROM templates ORDER BY created_at DESC").all();
  return result.results;
}

export async function getTemplateById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM templates WHERE id = ?").bind(id).first();
}

export async function createTemplate(db: D1Database, data: { name: string; category?: string; messageType?: string; content: string }) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO templates (name, category, message_type, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
    .bind(data.name, data.category ?? null, data.messageType ?? 'text', data.content, now, now)
    .first();
}

export async function updateTemplate(db: D1Database, id: number, data: Partial<{ name: string; category: string; content: string }>) {
  const now = jstNow();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
  if (data.category !== undefined) { sets.push("category = ?"); values.push(data.category); }
  if (data.content !== undefined) { sets.push("content = ?"); values.push(data.content); }
  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);
  await db.prepare(`UPDATE templates SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteTemplate(db: D1Database, id: number) {
  await db.prepare("DELETE FROM templates WHERE id = ?").bind(id).run();
}

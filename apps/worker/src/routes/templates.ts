import { Hono } from "hono";
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/templates", async (c) => {
  const category = c.req.query("category");
  const templates = await getTemplates(c.env.DB, category);
  return c.json({ success: true, data: templates });
});

app.post("/api/templates", async (c) => {
  const body = await c.req.json<{ name: string; category?: string; messageType?: string; content: string }>();
  const template = await createTemplate(c.env.DB, body);
  return c.json({ success: true, data: template });
});

app.get("/api/templates/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const template = await getTemplateById(c.env.DB, id);
  if (!template) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: template });
});

app.put("/api/templates/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateTemplate(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/templates/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteTemplate(c.env.DB, id);
  return c.json({ success: true });
});

export default app;

import { Hono } from "hono";
import { getTags, createTag, deleteTag } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/tags", async (c) => {
  const tags = await getTags(c.env.DB);
  return c.json({ success: true, data: tags });
});

app.post("/api/tags", async (c) => {
  const body = await c.req.json<{ name: string; color?: string }>();
  const tag = await createTag(c.env.DB, body.name, body.color);
  return c.json({ success: true, data: tag });
});

app.delete("/api/tags/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteTag(c.env.DB, id);
  return c.json({ success: true });
});

export default app;

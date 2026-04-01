import { Hono } from "hono";
import { getAccountHealthLogs, getMigrations, getMigrationById, createMigration } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/accounts/:id/health", async (c) => {
  const id = Number(c.req.param("id"));
  const logs = await getAccountHealthLogs(c.env.DB, id);
  return c.json({ success: true, data: logs });
});

app.get("/api/accounts/migrations", async (c) => {
  const migrations = await getMigrations(c.env.DB);
  return c.json({ success: true, data: migrations });
});

app.post("/api/accounts/migrations", async (c) => {
  const body = await c.req.json<{ fromAccountId: number; toAccountId: number; totalFriends?: number }>();
  const migration = await createMigration(c.env.DB, body);
  return c.json({ success: true, data: migration });
});

app.get("/api/accounts/migrations/:migrationId", async (c) => {
  const id = Number(c.req.param("migrationId"));
  const migration = await getMigrationById(c.env.DB, id);
  if (!migration) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: migration });
});

export default app;

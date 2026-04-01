import { Hono } from "hono";
import { getScoringRules, createScoringRule, updateScoringRule, deleteScoringRule, getFriendScore, getFriendScoreHistory, addScore } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/scoring-rules", async (c) => {
  const rules = await getScoringRules(c.env.DB);
  return c.json({ success: true, data: rules });
});

app.post("/api/scoring-rules", async (c) => {
  const body = await c.req.json<{ name: string; eventType: string; condition?: string; scoreDelta: number }>();
  const rule = await createScoringRule(c.env.DB, body);
  return c.json({ success: true, data: rule });
});

app.put("/api/scoring-rules/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateScoringRule(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/scoring-rules/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteScoringRule(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/friends/:id/score", async (c) => {
  const id = Number(c.req.param("id"));
  const score = await getFriendScore(c.env.DB, id);
  const history = await getFriendScoreHistory(c.env.DB, id);
  return c.json({ success: true, data: { score: score?.score ?? 0, history } });
});

app.post("/api/friends/:id/score", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ delta: number; reason?: string }>();
  await addScore(c.env.DB, id, body.delta, undefined, body.reason);
  return c.json({ success: true });
});

export default app;

import { Hono } from "hono";
import {
  getScenarios,
  getScenarioById,
  createScenario,
  updateScenario,
  deleteScenario,
  getScenarioSteps,
  createScenarioStep,
  updateScenarioStep,
  deleteScenarioStep,
  enrollFriendInScenario,
} from "@line-crm/db";

type Env = { DB: D1Database; API_KEY: string };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/scenarios", async (c) => {
  const scenarios = await getScenarios(c.env.DB);
  return c.json({ success: true, data: scenarios });
});

app.post("/api/scenarios", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; triggerType?: string; triggerTagId?: number }>();
  const scenario = await createScenario(c.env.DB, {
    name: body.name,
    description: body.description,
    triggerType: body.triggerType ?? "manual",
    triggerTagId: body.triggerTagId,
  });
  return c.json({ success: true, data: scenario });
});

app.get("/api/scenarios/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const scenario = await getScenarioById(c.env.DB, id);
  if (!scenario) return c.json({ success: false, error: "Not found" }, 404);
  const steps = await getScenarioSteps(c.env.DB, id);
  return c.json({ success: true, data: { ...scenario, steps } });
});

app.put("/api/scenarios/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name?: string; description?: string; isActive?: boolean }>();
  await updateScenario(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/scenarios/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteScenario(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/scenarios/:id/steps", async (c) => {
  const id = Number(c.req.param("id"));
  const steps = await getScenarioSteps(c.env.DB, id);
  return c.json({ success: true, data: steps });
});

app.post("/api/scenarios/:id/steps", async (c) => {
  const scenarioId = Number(c.req.param("id"));
  const body = await c.req.json<{ stepOrder: number; delayMinutes: number; messageType: string; messageContent: string; conditionType?: string; conditionValue?: string; nextStepOnFalse?: number }>();
  const step = await createScenarioStep(c.env.DB, { scenarioId, ...body });
  return c.json({ success: true, data: step });
});

app.put("/api/scenarios/:id/steps/:stepId", async (c) => {
  const stepId = Number(c.req.param("stepId"));
  const body = await c.req.json();
  await updateScenarioStep(c.env.DB, stepId, body);
  return c.json({ success: true });
});

app.delete("/api/scenarios/:id/steps/:stepId", async (c) => {
  const stepId = Number(c.req.param("stepId"));
  await deleteScenarioStep(c.env.DB, stepId);
  return c.json({ success: true });
});

app.post("/api/scenarios/:id/enroll/:friendId", async (c) => {
  const scenarioId = Number(c.req.param("id"));
  const friendId = Number(c.req.param("friendId"));
  await enrollFriendInScenario(c.env.DB, friendId, scenarioId);
  return c.json({ success: true });
});

export default app;

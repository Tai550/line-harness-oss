import { Hono } from "hono";
import {
  getReminders, getReminderById, createReminder, updateReminder, deleteReminder,
  getReminderSteps, createReminderStep, updateReminderStep, deleteReminderStep,
  enrollFriendInReminder,
} from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/reminders", async (c) => {
  const reminders = await getReminders(c.env.DB);
  return c.json({ success: true, data: reminders });
});

app.post("/api/reminders", async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const reminder = await createReminder(c.env.DB, body);
  return c.json({ success: true, data: reminder });
});

app.get("/api/reminders/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const reminder = await getReminderById(c.env.DB, id);
  if (!reminder) return c.json({ success: false, error: "Not found" }, 404);
  const steps = await getReminderSteps(c.env.DB, id);
  return c.json({ success: true, data: { ...reminder, steps } });
});

app.put("/api/reminders/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateReminder(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/reminders/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteReminder(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/reminders/:id/steps", async (c) => {
  const reminderId = Number(c.req.param("id"));
  const body = await c.req.json<{ stepOrder: number; offsetMinutes: number; messageType: string; messageContent: string }>();
  const step = await createReminderStep(c.env.DB, { reminderId, ...body });
  return c.json({ success: true, data: step });
});

app.put("/api/reminders/:id/steps/:stepId", async (c) => {
  const stepId = Number(c.req.param("stepId"));
  const body = await c.req.json();
  await updateReminderStep(c.env.DB, stepId, body);
  return c.json({ success: true });
});

app.delete("/api/reminders/:id/steps/:stepId", async (c) => {
  const stepId = Number(c.req.param("stepId"));
  await deleteReminderStep(c.env.DB, stepId);
  return c.json({ success: true });
});

app.post("/api/reminders/:id/enroll/:friendId", async (c) => {
  const reminderId = Number(c.req.param("id"));
  const friendId = Number(c.req.param("friendId"));
  const body = await c.req.json<{ targetDate: string }>();
  await enrollFriendInReminder(c.env.DB, friendId, reminderId, body.targetDate);
  return c.json({ success: true });
});

app.get("/api/friends/:friendId/reminders", async (c) => {
  const friendId = Number(c.req.param("friendId"));
  const result = await c.env.DB.prepare("SELECT fr.*, r.name as reminder_name FROM friend_reminders fr JOIN reminders r ON r.id = fr.reminder_id WHERE fr.friend_id = ?").bind(friendId).all();
  return c.json({ success: true, data: result.results });
});

export default app;

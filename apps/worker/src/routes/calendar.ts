import { Hono } from "hono";
import {
  getCalendarConnections, getCalendarConnectionById, createCalendarConnection, deleteCalendarConnection,
  getCalendarBookings, createCalendarBooking, updateBookingStatus, getBookingsInRange,
} from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/integrations/google-calendar/connections", async (c) => {
  const connections = await getCalendarConnections(c.env.DB);
  return c.json({ success: true, data: connections });
});

app.post("/api/integrations/google-calendar/connections", async (c) => {
  const body = await c.req.json();
  const connection = await createCalendarConnection(c.env.DB, body);
  return c.json({ success: true, data: connection });
});

app.delete("/api/integrations/google-calendar/connections/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteCalendarConnection(c.env.DB, id);
  return c.json({ success: true });
});

app.get("/api/integrations/google-calendar/slots", async (c) => {
  const connectionId = Number(c.req.query("connectionId") ?? 0);
  const date = c.req.query("date") ?? new Date().toISOString().split("T")[0];
  const connection = await getCalendarConnectionById(c.env.DB, connectionId);
  if (!connection) return c.json({ success: false, error: "Not found" }, 404);

  const conn = connection as { available_hours: string; slot_duration_minutes: number; buffer_minutes: number };
  const hours = JSON.parse(conn.available_hours);
  const slots: Array<{ start: string; end: string }> = [];
  const duration = conn.slot_duration_minutes;
  const buffer = conn.buffer_minutes;

  const startHour = parseInt(hours.start.split(":")[0]);
  const endHour = parseInt(hours.end.split(":")[0]);
  const existing = await getBookingsInRange(c.env.DB, connectionId, `${date}T00:00:00`, `${date}T23:59:59`);

  for (let h = startHour; h < endHour; h += (duration + buffer) / 60) {
    const hour = Math.floor(h);
    const min = Math.round((h - hour) * 60);
    const start = `${date}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
    const endDate = new Date(new Date(start).getTime() + duration * 60000);
    const end = endDate.toISOString().replace("Z", "");
    const conflict = (existing as Array<{ start_time: string; end_time: string }>).some(
      (b) => b.start_time < end && b.end_time > start
    );
    if (!conflict) slots.push({ start, end });
  }
  return c.json({ success: true, data: slots });
});

app.get("/api/integrations/google-calendar/bookings", async (c) => {
  const connectionId = c.req.query("connectionId") ? Number(c.req.query("connectionId")) : undefined;
  const bookings = await getCalendarBookings(c.env.DB, { connectionId });
  return c.json({ success: true, data: bookings });
});

app.post("/api/integrations/google-calendar/bookings", async (c) => {
  const body = await c.req.json();
  const booking = await createCalendarBooking(c.env.DB, body);
  return c.json({ success: true, data: booking });
});

app.put("/api/integrations/google-calendar/bookings/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string }>();
  await updateBookingStatus(c.env.DB, id, body.status);
  return c.json({ success: true });
});

export default app;

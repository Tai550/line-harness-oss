import { jstNow } from "./utils";

export async function getCalendarConnections(db: D1Database) {
  const result = await db.prepare("SELECT * FROM google_calendar_connections ORDER BY created_at DESC").all();
  return result.results;
}

export async function getCalendarConnectionById(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM google_calendar_connections WHERE id = ?").bind(id).first();
}

export async function createCalendarConnection(db: D1Database, data: {
  name: string; calendarId: string; accessToken: string; refreshToken?: string;
  slotDurationMinutes?: number; availableHours?: string; bufferMinutes?: number;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO google_calendar_connections (name, calendar_id, access_token, refresh_token, slot_duration_minutes, available_hours, buffer_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?) RETURNING *")
    .bind(data.name, data.calendarId, data.accessToken, data.refreshToken ?? null, data.slotDurationMinutes ?? 60, data.availableHours ?? '{"start":"09:00","end":"18:00"}', data.bufferMinutes ?? 0, now, now)
    .first();
}

export async function deleteCalendarConnection(db: D1Database, id: number) {
  await db.prepare("DELETE FROM google_calendar_connections WHERE id = ?").bind(id).run();
}

export async function getCalendarBookings(db: D1Database, { connectionId, limit = 50 }: { connectionId?: number; limit?: number } = {}) {
  if (connectionId) {
    const result = await db.prepare("SELECT * FROM calendar_bookings WHERE connection_id = ? AND status != 'cancelled' ORDER BY start_time ASC LIMIT ?").bind(connectionId, limit).all();
    return result.results;
  }
  const result = await db.prepare("SELECT * FROM calendar_bookings WHERE status != 'cancelled' ORDER BY start_time ASC LIMIT ?").bind(limit).all();
  return result.results;
}

export async function createCalendarBooking(db: D1Database, data: {
  connectionId: number; friendId?: number; googleEventId?: string; startTime: string; endTime: string;
  title: string; description?: string; metadata?: string;
}) {
  const now = jstNow();
  return db
    .prepare("INSERT INTO calendar_bookings (connection_id, friend_id, google_event_id, start_time, end_time, title, description, status, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?) RETURNING *")
    .bind(data.connectionId, data.friendId ?? null, data.googleEventId ?? null, data.startTime, data.endTime, data.title, data.description ?? null, data.metadata ?? null, now, now)
    .first();
}

export async function updateBookingStatus(db: D1Database, id: number, status: string) {
  const now = jstNow();
  await db.prepare("UPDATE calendar_bookings SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
}

export async function getBookingsInRange(db: D1Database, connectionId: number, start: string, end: string) {
  const result = await db
    .prepare("SELECT * FROM calendar_bookings WHERE connection_id = ? AND start_time >= ? AND end_time <= ? AND status != 'cancelled'")
    .bind(connectionId, start, end)
    .all();
  return result.results;
}

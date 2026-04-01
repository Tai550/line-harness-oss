export async function getMessageLogDailySummary(
  db: D1Database,
  dateFrom: string,
  dateTo: string
): Promise<Array<{ date: string; direction: string; message_type: string; count: number }>> {
  const result = await db
    .prepare(
      `SELECT DATE(created_at) as date, direction, message_type, COUNT(*) as count
       FROM messages_log
       WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
       GROUP BY DATE(created_at), direction, message_type
       ORDER BY date ASC`
    )
    .bind(dateFrom, dateTo)
    .all();
  return result.results as Array<{ date: string; direction: string; message_type: string; count: number }>;
}

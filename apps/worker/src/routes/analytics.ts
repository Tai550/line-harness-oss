import { Hono } from "hono";
import { getLineAccountById } from "@line-crm/db";
import { getMessageLogDailySummary } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import type { MessageAnalyticsResponse, MessageLogDailySummary, LineInsightCountResponse } from "@line-crm/shared";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

function toYYYYMMDD(date: string): string {
  return date.replace(/-/g, "");
}

function toDateStr(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  const current = new Date(start);
  let count = 0;
  while (current <= end && count < 14) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
    count++;
  }
  return dates;
}

app.get("/api/analytics/messages", async (c) => {
  const accountId = Number(c.req.query("accountId"));
  const fromParam = c.req.query("from");
  const toParam = c.req.query("to");

  if (!accountId || !fromParam || !toParam) {
    return c.json({ success: false, error: "accountId, from, to are required" }, 400);
  }

  const account = await getLineAccountById(c.env.DB, accountId) as {
    id: number; name: string; channel_access_token: string;
  } | null;

  if (!account) {
    return c.json({ success: false, error: "Account not found" }, 404);
  }

  const dates = dateRange(fromParam, toParam);
  if (dates.length === 0) {
    return c.json({ success: false, error: "Invalid date range" }, 400);
  }

  try {
    const client = new LineClient(account.channel_access_token);

    const insightDelivery: Record<string, LineInsightCountResponse> = {};
    const insightFollowers: Record<string, LineInsightCountResponse> = {};

    const batchSize = 5;
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.flatMap((date) => {
          const yyyymmdd = toYYYYMMDD(date);
          return [
            client.getInsightMessageDelivery(yyyymmdd).then((r) => ({ date: yyyymmdd, type: "delivery" as const, data: r })),
            client.getInsightFollowers(yyyymmdd).then((r) => ({ date: yyyymmdd, type: "followers" as const, data: r })),
          ];
        })
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { date, type, data } = result.value;
          if (type === "delivery") insightDelivery[date] = data;
          else insightFollowers[date] = data;
        }
      }
    }

    const rawRows = await getMessageLogDailySummary(c.env.DB, fromParam, toParam);

    const dayMap = new Map<string, MessageLogDailySummary>();
    for (const row of rawRows) {
      let entry = dayMap.get(row.date);
      if (!entry) {
        entry = { date: row.date, inbound_total: 0, outbound_total: 0, inbound_by_type: {}, outbound_by_type: {} };
        dayMap.set(row.date, entry);
      }
      if (row.direction === "inbound") {
        entry.inbound_total += row.count;
        entry.inbound_by_type[row.message_type] = (entry.inbound_by_type[row.message_type] ?? 0) + row.count;
      } else {
        entry.outbound_total += row.count;
        entry.outbound_by_type[row.message_type] = (entry.outbound_by_type[row.message_type] ?? 0) + row.count;
      }
    }

    const response: MessageAnalyticsResponse = {
      accountId: account.id,
      accountName: account.name,
      dateFrom: fromParam,
      dateTo: toParam,
      insightDelivery,
      insightFollowers,
      localMessages: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };

    return c.json({ success: true, data: response });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      502
    );
  }
});

export default app;

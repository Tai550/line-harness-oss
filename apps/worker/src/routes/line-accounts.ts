import { Hono } from "hono";
import { getLineAccounts, getLineAccountById, createLineAccount, updateLineAccount, deleteLineAccount } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import type { LineAccountAnalytics } from "@line-crm/shared";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

function formatInsightDate(rawDate?: string) {
  const today = new Date();
  today.setHours(today.getHours() + 9);
  today.setDate(today.getDate() - 1);
  const fallback = today.toISOString().slice(0, 10).replace(/-/g, "");

  if (!rawDate) {
    return fallback;
  }

  const normalized = rawDate.replace(/-/g, "");
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error("date must be in YYYY-MM-DD or YYYYMMDD format");
  }

  return normalized;
}

app.get("/api/line-accounts", async (c) => {
  const accounts = await getLineAccounts(c.env.DB);
  return c.json({ success: true, data: accounts });
});

app.post("/api/line-accounts", async (c) => {
  const body = await c.req.json<{ name: string; channelId: string; channelSecret: string; channelAccessToken: string }>();
  const account = await createLineAccount(c.env.DB, body);
  return c.json({ success: true, data: account });
});

app.get("/api/line-accounts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = await getLineAccountById(c.env.DB, id);
  if (!account) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: account });
});

app.get("/api/line-accounts/:id/analytics", async (c) => {
  const id = Number(c.req.param("id"));
  const account = await getLineAccountById(c.env.DB, id) as { id: number; name: string; channel_access_token: string } | null;

  if (!account) {
    return c.json({ success: false, error: "Not found" }, 404);
  }

  let insightDate: string;
  try {
    insightDate = formatInsightDate(c.req.query("date"));
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Invalid date" }, 400);
  }

  try {
    const client = new LineClient(account.channel_access_token);
    const [delivery, followers, demographic] = await Promise.all([
      client.getInsightMessageDelivery(insightDate),
      client.getInsightFollowers(insightDate),
      client.getInsightDemographic(),
    ]);

    const analytics: LineAccountAnalytics = {
      accountId: account.id,
      accountName: account.name,
      requestedDate: insightDate,
      delivery,
      followers,
      demographic,
    };

    return c.json({ success: true, data: analytics });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch LINE analytics" },
      502
    );
  }
});

app.put("/api/line-accounts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateLineAccount(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/line-accounts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteLineAccount(c.env.DB, id);
  return c.json({ success: true });
});

export default app;

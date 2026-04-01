import { Hono } from "hono";
import { getAffiliates, getAffiliateById, createAffiliate, updateAffiliate, deleteAffiliate, recordAffiliateClick, getAffiliateReport } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/affiliates", async (c) => {
  const affiliates = await getAffiliates(c.env.DB);
  return c.json({ success: true, data: affiliates });
});

app.post("/api/affiliates", async (c) => {
  const body = await c.req.json<{ name: string; refCode: string; commissionRate?: number }>();
  const affiliate = await createAffiliate(c.env.DB, body);
  return c.json({ success: true, data: affiliate });
});

app.put("/api/affiliates/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateAffiliate(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/affiliates/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteAffiliate(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/affiliates/click", async (c) => {
  const body = await c.req.json<{ affiliateId: number; friendId?: number }>();
  const ip = c.req.header("CF-Connecting-IP");
  const ua = c.req.header("User-Agent");
  await recordAffiliateClick(c.env.DB, body.affiliateId, body.friendId, ip, ua);
  return c.json({ success: true });
});

app.get("/api/affiliates/:id/report", async (c) => {
  const id = Number(c.req.param("id"));
  const report = await getAffiliateReport(c.env.DB, id);
  return c.json({ success: true, data: report });
});

app.get("/api/affiliates-report", async (c) => {
  const affiliates = await getAffiliates(c.env.DB);
  const reports = await Promise.all(
    (affiliates as Array<{ id: number; name: string; ref_code: string }>).map(async (a) => ({
      ...a,
      report: await getAffiliateReport(c.env.DB, a.id),
    }))
  );
  return c.json({ success: true, data: reports });
});

export default app;

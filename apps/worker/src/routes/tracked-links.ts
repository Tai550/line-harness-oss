import { Hono } from "hono";
import { getTrackedLinks, getTrackedLinkById, createTrackedLink, deleteTrackedLink, recordLinkClick, getLinkClicks } from "@line-crm/db";
import { addTagToFriend, enrollFriendInScenario } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/tracked-links", async (c) => {
  const links = await getTrackedLinks(c.env.DB);
  return c.json({ success: true, data: links });
});

app.post("/api/tracked-links", async (c) => {
  const body = await c.req.json<{ name: string; destinationUrl: string; tagIds?: string; scenarioId?: number }>();
  const link = await createTrackedLink(c.env.DB, body);
  return c.json({ success: true, data: link });
});

app.get("/api/tracked-links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const link = await getTrackedLinkById(c.env.DB, id);
  if (!link) return c.json({ success: false, error: "Not found" }, 404);
  const clicks = await getLinkClicks(c.env.DB, id);
  return c.json({ success: true, data: { ...link, clicks } });
});

app.delete("/api/tracked-links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteTrackedLink(c.env.DB, id);
  return c.json({ success: true });
});

// Redirect handler
app.get("/t/:linkId", async (c) => {
  const linkId = Number(c.req.param("linkId"));
  const link = await getTrackedLinkById(c.env.DB, linkId);
  if (!link) return c.redirect("/");
  const l = link as { destination_url: string; tag_ids: string; scenario_id: number | null; is_active: number };
  if (!l.is_active) return c.redirect(l.destination_url);

  // Async side-effects
  const ip = c.req.header("CF-Connecting-IP");
  const ua = c.req.header("User-Agent");
  c.executionCtx.waitUntil(
    (async () => {
      await recordLinkClick(c.env.DB, linkId, undefined, ip, ua);
      // Tag/scenario side-effects would need friend resolution via cookie/query param
    })()
  );
  return c.redirect(l.destination_url);
});

export default app;

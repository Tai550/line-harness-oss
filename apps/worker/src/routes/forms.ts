import { Hono } from "hono";
import { getForms, getFormById, createForm, updateForm, deleteForm, createFormSubmission, getFormSubmissions } from "@line-crm/db";
import { getFriendByLineUserId, addTagToFriend, enrollFriendInScenario } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/forms", async (c) => {
  const forms = await getForms(c.env.DB);
  return c.json({ success: true, data: forms });
});

app.post("/api/forms", async (c) => {
  const body = await c.req.json<{ name: string; description?: string; fields?: string; tagIds?: string; scenarioId?: number }>();
  const form = await createForm(c.env.DB, body);
  return c.json({ success: true, data: form });
});

app.get("/api/forms/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const form = await getFormById(c.env.DB, id);
  if (!form) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: form });
});

app.put("/api/forms/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateForm(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/forms/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteForm(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/forms/:id/submit", async (c) => {
  const formId = Number(c.req.param("id"));
  const form = await getFormById(c.env.DB, formId);
  if (!form) return c.json({ success: false, error: "Not found" }, 404);
  const body = await c.req.json<{ lineUserId?: string; friendId?: number; data: Record<string, unknown> }>();

  let friendId: number | null = null;
  if (body.lineUserId) {
    const friend = await getFriendByLineUserId(c.env.DB, body.lineUserId);
    if (friend) friendId = (friend as { id: number }).id;
  } else if (body.friendId) {
    friendId = body.friendId;
  }

  await createFormSubmission(c.env.DB, formId, friendId, JSON.stringify(body.data));

  const f = form as { tag_ids: string; scenario_id: number | null };
  if (friendId) {
    const tagIds: number[] = JSON.parse(f.tag_ids ?? "[]");
    for (const tagId of tagIds) {
      await addTagToFriend(c.env.DB, friendId, tagId).catch(() => {});
    }
    if (f.scenario_id) {
      await enrollFriendInScenario(c.env.DB, friendId, f.scenario_id).catch(() => {});
    }
  }

  return c.json({ success: true });
});

app.get("/api/forms/:id/submissions", async (c) => {
  const id = Number(c.req.param("id"));
  const submissions = await getFormSubmissions(c.env.DB, id);
  return c.json({ success: true, data: submissions });
});

export default app;

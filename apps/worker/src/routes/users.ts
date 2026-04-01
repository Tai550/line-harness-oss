import { Hono } from "hono";
import { getUsers, getUserById, createUser, updateUser, deleteUser, linkFriendToUser, getUserFriends } from "@line-crm/db";

type Env = { DB: D1Database };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/users", async (c) => {
  const users = await getUsers(c.env.DB);
  return c.json({ success: true, data: users });
});

app.post("/api/users", async (c) => {
  const body = await c.req.json<{ email?: string; phone?: string; name?: string }>();
  const user = await createUser(c.env.DB, body);
  return c.json({ success: true, data: user });
});

app.get("/api/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const user = await getUserById(c.env.DB, id);
  if (!user) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data: user });
});

app.put("/api/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  await updateUser(c.env.DB, id, body);
  return c.json({ success: true });
});

app.delete("/api/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteUser(c.env.DB, id);
  return c.json({ success: true });
});

app.post("/api/users/:id/link", async (c) => {
  const userId = Number(c.req.param("id"));
  const body = await c.req.json<{ friendId: number }>();
  await linkFriendToUser(c.env.DB, userId, body.friendId);
  return c.json({ success: true });
});

app.get("/api/users/:id/accounts", async (c) => {
  const id = Number(c.req.param("id"));
  const friends = await getUserFriends(c.env.DB, id);
  return c.json({ success: true, data: friends });
});

export default app;

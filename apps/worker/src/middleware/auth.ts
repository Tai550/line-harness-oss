import { Context, Next } from "hono";

const PUBLIC_PATHS = [
  "/webhook",
  "/docs",
  "/openapi.json",
  "/api/affiliates/click",
  "/auth/",
  "/t/",
];

export async function authMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }
  if (path.startsWith("/api/liff/") || path.startsWith("/api/forms/")) {
    return next();
  }

  const authHeader = c.req.header("Authorization");
  const apiKey = c.env.API_KEY;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  return next();
}

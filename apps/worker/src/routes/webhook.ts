import { Hono } from "hono";
import { verifySignature } from "@line-crm/line-sdk";
import { LineClient } from "@line-crm/line-sdk";
import {
  upsertFriend,
  updateFriendFollowStatus,
  getFriendByLineUserId,
  getScenarios,
  enrollFriendInScenario,
  upsertChatOnMessage,
} from "@line-crm/db";
import { fireEvent } from "../services/event-bus";

type Env = {
  DB: D1Database;
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  API_KEY: string;
};

interface AccountRow {
  id: number;
  channel_secret: string;
  channel_access_token: string;
  is_active: number;
}

const app = new Hono<{ Bindings: Env }>();

app.post("/webhook", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("x-line-signature") ?? "";
  const db = c.env.DB;

  // Try matching signature against all registered accounts
  const accounts = (await db.prepare("SELECT id, channel_secret, channel_access_token, is_active FROM line_accounts WHERE is_active = 1").all()).results as unknown as AccountRow[];

  let matchedToken: string | null = null;
  let matchedAccountId: number | null = null;

  for (const account of accounts) {
    const valid = await verifySignature(account.channel_secret, body, signature);
    if (valid) {
      matchedToken = account.channel_access_token;
      matchedAccountId = account.id;
      break;
    }
  }

  // Fallback to env vars
  if (!matchedToken) {
    const valid = await verifySignature(c.env.LINE_CHANNEL_SECRET, body, signature);
    if (valid) {
      matchedToken = c.env.LINE_CHANNEL_ACCESS_TOKEN;
    }
  }

  if (!matchedToken) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const payload = JSON.parse(body);
  const lineClient = new LineClient(matchedToken);

  c.executionCtx.waitUntil(
    (async () => {
      console.log(`[webhook] Processing ${(payload.events ?? []).length} events`);
      for (const event of payload.events ?? []) {
        console.log(`[webhook] Event type: ${event.type}, source: ${JSON.stringify(event.source)}`);
        try {
          if (event.type === "follow") {
            const userId = event.source?.userId;
            if (!userId) { console.log("[webhook] follow: no userId, skip"); continue; }
            console.log(`[webhook] follow: getProfile for ${userId}`);
            const profile = await lineClient.getProfile(userId);
            console.log(`[webhook] follow: profile = ${JSON.stringify(profile)}`);
            const friend = await upsertFriend(db, {
              lineUserId: userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
              accountId: matchedAccountId ?? undefined,
            });
            console.log(`[webhook] follow: upsertFriend result = ${JSON.stringify(friend)}`);
            if (!friend) { console.log("[webhook] follow: friend is null, skip"); continue; }
            const friendId = (friend as { id: number }).id;
            await upsertChatOnMessage(db, friendId);
            console.log(`[webhook] follow: friendId=${friendId}, checking scenarios`);
            const scenarios = await getScenarios(db);
            for (const scenario of scenarios as Array<{ id: number; trigger_type: string; is_active: number }>) {
              if (scenario.trigger_type === "friend_add" && scenario.is_active) {
                await enrollFriendInScenario(db, friendId, scenario.id);
              }
            }
            await fireEvent("friend_add", { friendId, lineUserId: userId }, db, c.env);
            console.log(`[webhook] follow: done for ${userId}`);
          } else if (event.type === "unfollow") {
            const userId = event.source?.userId;
            if (userId) await updateFriendFollowStatus(db, userId, false);
            console.log(`[webhook] unfollow: done for ${userId}`);
          } else if (event.type === "message" && event.message?.type === "text") {
            const userId = event.source?.userId;
            if (!userId) { console.log("[webhook] message: no userId, skip"); continue; }
            console.log(`[webhook] message: looking up friend for ${userId}`);
            const friend = await getFriendByLineUserId(db, userId);
            if (!friend) {
              console.log(`[webhook] message: friend not found for ${userId}, auto-registering`);
              const profile = await lineClient.getProfile(userId);
              const newFriend = await upsertFriend(db, {
                lineUserId: userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                statusMessage: profile.statusMessage,
                accountId: matchedAccountId ?? undefined,
              });
              if (!newFriend) { console.log("[webhook] message: auto-register failed, skip"); continue; }
              const friendId = (newFriend as { id: number }).id;
              const text: string = event.message.text;
              await db
                .prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, created_at) VALUES (?, 'inbound', 'text', ?, ?)")
                .bind(friendId, text, new Date().toISOString())
                .run();
              await upsertChatOnMessage(db, friendId);
              await fireEvent("message_received", { friendId, text }, db, c.env);
              console.log(`[webhook] message: auto-registered & logged for ${userId}`);
              continue;
            }
            const text: string = event.message.text;
            const rules = await db.prepare("SELECT * FROM auto_replies WHERE is_active = 1").all();
            for (const rule of rules.results as Array<{ match_type: string; keyword: string; reply_content: string }>) {
              const match =
                rule.match_type === "exact"
                  ? text === rule.keyword
                  : text.includes(rule.keyword);
              if (match) {
                await lineClient.replyMessage(event.replyToken, [{ type: "text", text: rule.reply_content }]);
                break;
              }
            }
            const friendId = (friend as { id: number }).id;
            await db
              .prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, created_at) VALUES (?, 'inbound', 'text', ?, ?)")
              .bind(friendId, text, new Date().toISOString())
              .run();
            await upsertChatOnMessage(db, friendId);
            await fireEvent("message_received", { friendId, text }, db, c.env);
            console.log(`[webhook] message: logged for friendId=${friendId}`);
          } else {
            console.log(`[webhook] Unhandled event type: ${event.type}`);
          }
        } catch (err) {
          console.error(`[webhook] Event error (${event.type}):`, (err as Error).message, (err as Error).stack);
        }
      }
      console.log("[webhook] All events processed");
    })()
  );

  return c.json({ success: true });
});

export default app;

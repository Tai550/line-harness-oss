import {
  getActiveOutgoingWebhooksByEvent,
  getActiveRulesByEvent,
  addScore,
  getActiveAutomationsByEvent,
  createAutomationLog,
  getActiveNotificationRulesByEvent,
  createNotification,
  addTagToFriend,
  removeTagFromFriend,
  enrollFriendInScenario,
} from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import type { AutomationRow } from "@line-crm/db";

type Env = {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  API_KEY: string;
};

export async function fireEvent(
  eventType: string,
  data: Record<string, unknown>,
  db: D1Database,
  env: Env
): Promise<void> {
  await Promise.allSettled([
    handleOutgoingWebhooks(eventType, data, db, env),
    handleScoringRules(eventType, data, db),
    handleAutomations(eventType, data, db, env),
    handleNotifications(eventType, data, db),
  ]);
}

async function handleOutgoingWebhooks(eventType: string, data: Record<string, unknown>, db: D1Database, env: Env) {
  const webhooks = await getActiveOutgoingWebhooksByEvent(db, eventType);
  for (const webhook of webhooks as Array<{ url: string; secret: string | null; headers: string }>) {
    const payload = JSON.stringify({ event: eventType, data, timestamp: new Date().toISOString() });
    const headers: Record<string, string> = { "Content-Type": "application/json", ...JSON.parse(webhook.headers ?? "{}") };
    if (webhook.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(webhook.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      headers["X-Line-Harness-Signature"] = btoa(String.fromCharCode(...new Uint8Array(sig)));
    }
    await fetch(webhook.url, { method: "POST", headers, body: payload }).catch(() => {});
  }
}

async function handleScoringRules(eventType: string, data: Record<string, unknown>, db: D1Database) {
  if (!data.friendId) return;
  const rules = await getActiveRulesByEvent(db, eventType);
  for (const rule of rules as Array<{ id: number; score_delta: number; name: string }>) {
    await addScore(db, data.friendId as number, rule.score_delta, rule.id, rule.name);
  }
}

async function handleAutomations(eventType: string, data: Record<string, unknown>, db: D1Database, env: Env) {
  const automations = await getActiveAutomationsByEvent(db, eventType);
  for (const automation of automations as AutomationRow[]) {
    const actions: Array<{ type: string; [key: string]: unknown }> = JSON.parse(automation.actions);
    const executed: string[] = [];
    let error: string | undefined;
    try {
      for (const action of actions) {
        if (action.type === "add_tag" && data.friendId) {
          await addTagToFriend(db, data.friendId as number, action.tagId as number);
          executed.push(`add_tag:${action.tagId}`);
        } else if (action.type === "remove_tag" && data.friendId) {
          await removeTagFromFriend(db, data.friendId as number, action.tagId as number);
          executed.push(`remove_tag:${action.tagId}`);
        } else if (action.type === "start_scenario" && data.friendId) {
          await enrollFriendInScenario(db, data.friendId as number, action.scenarioId as number);
          executed.push(`start_scenario:${action.scenarioId}`);
        } else if (action.type === "send_message" && data.friendId) {
          const friend = await db.prepare("SELECT line_user_id FROM friends WHERE id = ?").bind(data.friendId).first<{ line_user_id: string }>();
          if (friend) {
            const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
            await lineClient.pushTextMessage(friend.line_user_id, action.message as string);
            executed.push("send_message");
          }
        } else if (action.type === "set_metadata" && data.friendId) {
          const now = new Date().toISOString();
          await db.prepare("UPDATE friends SET metadata = json_patch(metadata, ?), updated_at = ? WHERE id = ?").bind(JSON.stringify(action.metadata ?? {}), now, data.friendId).run();
          executed.push("set_metadata");
        }
      }
    } catch (e) {
      error = String(e);
    }
    await createAutomationLog(db, {
      automationId: automation.id,
      friendId: data.friendId as number | undefined,
      triggerEvent: eventType,
      actionsExecuted: JSON.stringify(executed),
      status: error ? "error" : "success",
      error,
    });
  }
}

async function handleNotifications(eventType: string, data: Record<string, unknown>, db: D1Database) {
  const rules = await getActiveNotificationRulesByEvent(db, eventType);
  for (const rule of rules as Array<{ id: number; channels: string; message_template: string }>) {
    const channels: string[] = JSON.parse(rule.channels);
    for (const channel of channels) {
      const message = rule.message_template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data[k] ?? ""));
      await createNotification(db, { ruleId: rule.id, channel, message, metadata: JSON.stringify(data) });
    }
  }
}

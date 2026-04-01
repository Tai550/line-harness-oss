import { getDueReminderDeliveries, markReminderStepDelivered, completeReminderIfDone } from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

export async function processReminderDeliveries(db: D1Database, env: Env) {
  const dueSteps = await getDueReminderDeliveries(db);
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);

  for (const step of dueSteps as Array<{
    id: number;
    friend_reminder_id: number;
    friend_id: number;
    line_user_id: string;
    is_following: number;
    message_type: string;
    message_content: string;
  }>) {
    try {
      if (!step.is_following) continue;
      if (step.message_type === "text") {
        await lineClient.pushTextMessage(step.line_user_id, step.message_content);
      } else if (step.message_type === "flex") {
        await lineClient.pushFlexMessage(step.line_user_id, "リマインダー", JSON.parse(step.message_content));
      } else if (step.message_type === "image") {
        await lineClient.pushMessage(step.line_user_id, [{ type: "image", originalContentUrl: step.message_content, previewImageUrl: step.message_content }]);
      }
      await db.prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, created_at) VALUES (?, 'outbound', ?, ?, ?)").bind(step.friend_id, step.message_type, step.message_content, new Date().toISOString()).run();
      await markReminderStepDelivered(db, step.id);
      await completeReminderIfDone(db, step.friend_reminder_id);
    } catch (e) {
      console.error("Reminder delivery error:", e);
    }
  }
}

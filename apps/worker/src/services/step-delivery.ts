import {
  getFriendScenariosDueForDelivery,
  getScenarioSteps,
  advanceFriendScenario,
  completeFriendScenario,
  getFriendTags,
} from "@line-crm/db";
import { LineClient } from "@line-crm/line-sdk";
import { addMessageVariation, addJitter } from "./stealth";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

export async function processStepDeliveries(db: D1Database, env: Env) {
  const dueFriendScenarios = await getFriendScenariosDueForDelivery(db);
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);

  for (const fs of dueFriendScenarios as Array<{
    id: number;
    friend_id: number;
    scenario_id: number;
    current_step: number;
  }>) {
    try {
      const friend = await db.prepare("SELECT * FROM friends WHERE id = ?").bind(fs.friend_id).first<{ line_user_id: string; is_following: number }>();
      if (!friend || !friend.is_following) {
        await completeFriendScenario(db, fs.id);
        continue;
      }

      const steps = await getScenarioSteps(db, fs.scenario_id) as Array<{
        id: number;
        step_order: number;
        delay_minutes: number;
        message_type: string;
        message_content: string;
        condition_type: string | null;
        condition_value: string | null;
        next_step_on_false: number | null;
      }>;

      const currentStep = steps.find((s) => s.step_order === fs.current_step);
      if (!currentStep) {
        await completeFriendScenario(db, fs.id);
        continue;
      }

      // Evaluate condition
      let conditionMet = true;
      if (currentStep.condition_type === "tag_exists") {
        const tags = await getFriendTags(db, fs.friend_id) as Array<{ id: number }>;
        conditionMet = tags.some((t) => t.id === Number(currentStep.condition_value));
      } else if (currentStep.condition_type === "tag_not_exists") {
        const tags = await getFriendTags(db, fs.friend_id) as Array<{ id: number }>;
        conditionMet = !tags.some((t) => t.id === Number(currentStep.condition_value));
      } else if (currentStep.condition_type === "metadata_equals") {
        const meta = await db.prepare("SELECT metadata FROM friends WHERE id = ?").bind(fs.friend_id).first<{ metadata: string }>();
        const [key, value] = (currentStep.condition_value ?? "=").split("=");
        conditionMet = JSON.parse(meta?.metadata ?? "{}")[key] === value;
      }

      let nextStepOrder: number | null = null;
      if (conditionMet) {
        // Send message
        const content = addMessageVariation(currentStep.message_content);
        if (currentStep.message_type === "text") {
          await lineClient.pushTextMessage(friend.line_user_id, content);
        } else if (currentStep.message_type === "flex") {
          await lineClient.pushFlexMessage(friend.line_user_id, "メッセージ", JSON.parse(currentStep.message_content));
        } else if (currentStep.message_type === "image") {
          await lineClient.pushMessage(friend.line_user_id, [{ type: "image", originalContentUrl: currentStep.message_content, previewImageUrl: currentStep.message_content }]);
        }
        // Log
        await db.prepare("INSERT INTO messages_log (friend_id, direction, message_type, content, scenario_step_id, created_at) VALUES (?, 'outbound', ?, ?, ?, ?)").bind(fs.friend_id, currentStep.message_type, currentStep.message_content, currentStep.id, new Date().toISOString()).run();
        const nextStep = steps.find((s) => s.step_order === fs.current_step + 1);
        nextStepOrder = nextStep ? nextStep.step_order : null;
      } else if (currentStep.next_step_on_false !== null) {
        nextStepOrder = currentStep.next_step_on_false;
      }

      if (nextStepOrder !== null) {
        const nextStep = steps.find((s) => s.step_order === nextStepOrder);
        const jitter = addJitter(0, 30000);
        const nextDeliveryAt = nextStep
          ? new Date(Date.now() + nextStep.delay_minutes * 60000 + jitter).toISOString()
          : null;
        if (nextDeliveryAt) {
          await advanceFriendScenario(db, fs.id, nextStepOrder, nextDeliveryAt);
        } else {
          await completeFriendScenario(db, fs.id);
        }
      } else {
        await completeFriendScenario(db, fs.id);
      }
    } catch (e) {
      console.error("Step delivery error:", e);
    }
  }
}

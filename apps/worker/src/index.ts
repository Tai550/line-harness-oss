import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth";
import webhookRoute from "./routes/webhook";
import friendsRoute from "./routes/friends";
import scenariosRoute from "./routes/scenarios";
import tagsRoute from "./routes/tags";
import broadcastsRoute from "./routes/broadcasts";
import automationsRoute from "./routes/automations";
import templatesRoute from "./routes/templates";
import remindersRoute from "./routes/reminders";
import scoringRoute from "./routes/scoring";
import notificationsRoute from "./routes/notifications";
import webhooksRoute from "./routes/webhooks";
import lineAccountsRoute from "./routes/line-accounts";
import trackedLinksRoute from "./routes/tracked-links";
import formsRoute from "./routes/forms";
import healthRoute from "./routes/health";
import usersRoute from "./routes/users";
import affiliatesRoute from "./routes/affiliates";
import conversionsRoute from "./routes/conversions";
import chatsRoute from "./routes/chats";
import calendarRoute from "./routes/calendar";
import richMenusRoute from "./routes/rich-menus";
import analyticsRoute from "./routes/analytics";
import { processStepDeliveries } from "./services/step-delivery";
import { processScheduledBroadcasts } from "./services/broadcast";
import { processReminderDeliveries } from "./services/reminder-delivery";
import { checkAccountHealth } from "./services/ban-monitor";

type Env = {
  DB: D1Database;
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*" }));
app.use("*", authMiddleware);

app.get("/", (c) => c.json({ name: "LINE Harness API", version: "0.1.0" }));

app.route("/", webhookRoute);
app.route("/", friendsRoute);
app.route("/", scenariosRoute);
app.route("/", tagsRoute);
app.route("/", broadcastsRoute);
app.route("/", automationsRoute);
app.route("/", templatesRoute);
app.route("/", remindersRoute);
app.route("/", scoringRoute);
app.route("/", notificationsRoute);
app.route("/", webhooksRoute);
app.route("/", lineAccountsRoute);
app.route("/", trackedLinksRoute);
app.route("/", formsRoute);
app.route("/", healthRoute);
app.route("/", usersRoute);
app.route("/", affiliatesRoute);
app.route("/", conversionsRoute);
app.route("/", chatsRoute);
app.route("/", calendarRoute);
app.route("/", richMenusRoute);
app.route("/", analyticsRoute);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      Promise.allSettled([
        processStepDeliveries(env.DB, env),
        processScheduledBroadcasts(env.DB, env),
        processReminderDeliveries(env.DB, env),
        checkAccountHealth(env.DB, env),
      ])
    );
  },
};

import { getLineAccounts, createAccountHealthLog } from "@line-crm/db";

type Env = { DB: D1Database; LINE_CHANNEL_ACCESS_TOKEN: string };

export async function checkAccountHealth(db: D1Database, _env: Env) {
  const accounts = await getLineAccounts(db);
  for (const account of accounts as Array<{ id: number; channel_access_token: string; is_active: number }>) {
    if (!account.is_active) continue;
    try {
      const res = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${account.channel_access_token}` },
      });
      let riskLevel = "normal";
      let details = "";
      if (res.status === 403) {
        riskLevel = "danger";
        details = "403 Forbidden - account may be banned";
      } else if (res.status === 429) {
        riskLevel = "warning";
        details = "429 Too Many Requests";
      } else if (!res.ok) {
        riskLevel = "warning";
        details = `HTTP ${res.status}`;
      }
      await createAccountHealthLog(db, { accountId: account.id, riskLevel, details });
    } catch (e) {
      await createAccountHealthLog(db, { accountId: account.id, riskLevel: "warning", details: String(e) });
    }
  }
}

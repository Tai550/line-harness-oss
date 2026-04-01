declare const liff: {
  init: (config: { liffId: string }) => Promise<void>;
  getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
  isLoggedIn: () => boolean;
  login: () => void;
  getAccessToken: () => string;
  getFriendship: () => Promise<{ friendFlag: boolean }>;
  openWindow: (params: { url: string; external: boolean }) => void;
  closeWindow: () => void;
};

const API_URL = import.meta.env.VITE_API_URL ?? "";
const LIFF_ID = import.meta.env.VITE_LIFF_ID ?? "";

const params = new URLSearchParams(window.location.search);
const page = params.get("page");
const refCode = params.get("ref") ?? "";
const redirect = params.get("redirect") ?? "";

async function init() {
  const app = document.getElementById("app")!;
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    if (page === "booking") {
      const { initBooking } = await import("./booking");
      initBooking(app, API_URL);
      return;
    }

    if (page === "form") {
      const { initForm } = await import("./form");
      const formId = params.get("formId") ?? "";
      initForm(app, API_URL, formId);
      return;
    }

    await linkAndAddFlow(app);
  } catch (e) {
    app.innerHTML = `<div class="container"><div class="card"><h1>エラー</h1><p>${e}</p></div></div>`;
  }
}

async function linkAndAddFlow(app: HTMLElement) {
  const [profile, friendship] = await Promise.all([
    liff.getProfile(),
    liff.getFriendship().catch(() => ({ friendFlag: false })),
  ]);

  // Register/link friend
  await fetch(`${API_URL}/api/liff/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      refCode,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
    }),
  }).catch(() => {});

  if (!friendship.friendFlag) {
    showFriendAdd(app, profile.displayName);
  } else {
    showCompletion(app, profile.displayName, redirect);
  }
}

function showFriendAdd(app: HTMLElement, displayName: string) {
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>友だち追加</h1>
        <p>${escapeHtml(displayName)}さん、まずは友だち追加をお願いします。</p>
        <button class="btn" id="addFriendBtn">友だち追加する</button>
      </div>
    </div>
  `;
  document.getElementById("addFriendBtn")?.addEventListener("click", () => {
    liff.openWindow({ url: `https://line.me/R/ti/p/@${import.meta.env.VITE_LINE_ID ?? ""}`, external: false });
    pollFriendship(app, displayName);
  });
}

function pollFriendship(app: HTMLElement, displayName: string) {
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      const friendship = await liff.getFriendship().catch(() => ({ friendFlag: false }));
      if (friendship.friendFlag) {
        showCompletion(app, displayName, redirect);
      }
    }
  });
}

function showCompletion(app: HTMLElement, displayName: string, redirectUrl: string) {
  app.innerHTML = `
    <div class="container">
      <div class="card success">
        <div class="icon">✅</div>
        <h1>完了しました</h1>
        <p>${escapeHtml(displayName)}さん、ありがとうございます！</p>
        ${redirectUrl ? `<button class="btn" id="redirectBtn">次へ進む</button>` : `<button class="btn" id="closeBtn">閉じる</button>`}
      </div>
    </div>
  `;
  document.getElementById("redirectBtn")?.addEventListener("click", () => {
    window.location.href = redirectUrl;
  });
  document.getElementById("closeBtn")?.addEventListener("click", () => {
    liff.closeWindow();
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

init();

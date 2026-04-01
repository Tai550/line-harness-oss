"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      localStorage.setItem("lh_api_url", apiUrl);
      localStorage.setItem("lh_api_key", apiKey);
      const res = await fetch(`${apiUrl}/api/friends/count`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("認証に失敗しました");
      router.push("/");
    } catch {
      setError("接続に失敗しました。URLとAPIキーを確認してください。");
      localStorage.removeItem("lh_api_key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-highlight">
      <div className="bg-white rounded-[8px] shadow-sm p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2 h-7 rounded-sm bg-brand-orange" />
          <h1 className="text-2xl font-bold text-brand-black" style={{ fontFamily: "var(--font-en), var(--font-ja)" }}>
            LINE Harness
          </h1>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-black/70 mb-1">Worker URL</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
              className="w-full border border-brand-lightgray rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black/70 mb-1">APIキー</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your-api-key"
              className="w-full border border-brand-lightgray rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition"
            />
          </div>
          {error && <p className="text-brand-alert text-sm">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading || !apiUrl || !apiKey}
            className="btn-primary w-full py-2.5 text-sm"
          >
            {loading ? "接続中..." : "ログイン"}
          </button>
        </div>
      </div>
    </div>
  );
}

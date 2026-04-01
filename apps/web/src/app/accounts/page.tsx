"use client";

import { useEffect, useMemo, useState } from "react";
import type { LineAccountAnalytics, LineInsightCountResponse, LineInsightDemographicItem } from "@line-crm/shared";
import { api } from "@/lib/api";
import { exportAnalyticsAsCsv, exportAnalyticsAsJson } from "@/lib/analytics-export";

interface LineAccount {
  id: number;
  name: string;
  channel_id: string;
  is_active: boolean;
  created_at: string;
}

function getDefaultInsightDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function formatInsightDateLabel(value: string) {
  if (!/^\d{8}$/.test(value)) {
    return value;
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatMetricLabel(key: string) {
  const labels: Record<string, string> = {
    followers: "累計友だち追加",
    targetedReaches: "到達友だち数",
    blocks: "ブロック数",
    broadcast: "一斉配信",
    targeting: "絞り込み配信",
    stepMessage: "ステップ配信",
    autoResponse: "自動応答",
    welcomeResponse: "あいさつメッセージ",
    chat: "チャット送信",
    apiBroadcast: "API broadcast",
    apiPush: "API push",
    apiMulticast: "API multicast",
    apiNarrowcast: "API narrowcast",
    apiReply: "API reply",
    ccAutoReply: "LINE Chat Plus 自動返信",
    ccManualReply: "LINE Chat Plus 手動返信",
    pnpNoticeMessage: "通知メッセージ",
    pnpCallToLine: "Call to LINE",
    thirdPartyChatTool: "外部チャットツール",
  };

  return labels[key] ?? key;
}

function metricEntries(data: LineInsightCountResponse) {
  return Object.entries(data).filter(([key, value]) => key !== "status" && typeof value === "number");
}

function topDemographic(items: LineInsightDemographicItem[], key: string) {
  return [...items].sort((a, b) => b.percentage - a.percentage).slice(0, 3).map((item) => ({
    label: String(item[key] ?? "-"),
    percentage: item.percentage,
  }));
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [analyticsDate, setAnalyticsDate] = useState(getDefaultInsightDate());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<Record<number, LineAccountAnalytics>>({});
  const [loadingAnalyticsId, setLoadingAnalyticsId] = useState<number | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = () => api.lineAccounts.list().then((r) => setAccounts(r.data as LineAccount[]));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name || !channelId || !channelSecret || !channelAccessToken) {
      setCreateError("すべての項目を入力してください");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.lineAccounts.create({ name, channelId, channelSecret, channelAccessToken });
      setName("");
      setChannelId("");
      setChannelSecret("");
      setChannelAccessToken("");
      load();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "追加に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (account: LineAccount) => {
    await api.lineAccounts.update(account.id, { isActive: !account.is_active });
    load();
  };

  const loadAnalytics = async (account: LineAccount) => {
    setSelectedAccountId(account.id);
    setLoadingAnalyticsId(account.id);
    setAnalyticsError(null);

    try {
      const response = await api.lineAccounts.analytics(account.id, analyticsDate);
      setAnalytics((current) => ({
        ...current,
        [account.id]: response.data as LineAccountAnalytics,
      }));
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : "アナリティクス取得に失敗しました");
    } finally {
      setLoadingAnalyticsId(null);
    }
  };

  const selectedAnalytics = useMemo(
    () => (selectedAccountId !== null ? analytics[selectedAccountId] : undefined),
    [analytics, selectedAccountId]
  );

  const deliveryMetrics = selectedAnalytics ? metricEntries(selectedAnalytics.delivery) : [];
  const followerMetrics = selectedAnalytics ? metricEntries(selectedAnalytics.followers) : [];
  const topGenders = selectedAnalytics ? topDemographic(selectedAnalytics.demographic.genders, "gender") : [];
  const topAges = selectedAnalytics ? topDemographic(selectedAnalytics.demographic.ages, "age") : [];
  const topAreas = selectedAnalytics ? topDemographic(selectedAnalytics.demographic.areas, "area") : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">LINEアカウント</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="アカウント名" className="border rounded px-3 py-2 text-sm" />
          <input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="チャンネルID" className="border rounded px-3 py-2 text-sm" />
        </div>
        <input value={channelSecret} onChange={(e) => setChannelSecret(e.target.value)} placeholder="チャンネルシークレット" type="password" className="w-full border rounded px-3 py-2 text-sm" />
        <input value={channelAccessToken} onChange={(e) => setChannelAccessToken(e.target.value)} placeholder="チャンネルアクセストークン" type="password" className="w-full border rounded px-3 py-2 text-sm" />
        {createError && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{createError}</p>}
        <button onClick={create} disabled={creating} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50">
          {creating ? "追加中..." : "追加"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-end gap-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">分析対象日</p>
          <input
            type="date"
            value={analyticsDate}
            max={getDefaultInsightDate()}
            onChange={(e) => setAnalyticsDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          LINE Insight API は通常、翌日分まで集計完了です。既定値は前日です。
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-medium">{a.name}</h3>
              <p className="text-xs text-gray-400">ID: {a.channel_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadAnalytics(a)} className="text-sm px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
                {loadingAnalyticsId === a.id ? "取得中..." : "分析を見る"}
              </button>
              <button onClick={() => toggle(a)} className={`text-sm px-3 py-1 rounded ${a.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                {a.is_active ? "有効" : "無効"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {analyticsError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{analyticsError}</div>
      ) : null}

      {selectedAnalytics ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selectedAnalytics.accountName} の分析</h2>
                <p className="text-sm text-gray-500">集計日: {formatInsightDateLabel(selectedAnalytics.requestedDate)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => exportAnalyticsAsCsv(selectedAnalytics)}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-100"
                >
                  CSV出力
                </button>
                <button
                  onClick={() => exportAnalyticsAsJson(selectedAnalytics)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
                >
                  JSON出力
                </button>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">送信数: {selectedAnalytics.delivery.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">友だち数: {selectedAnalytics.followers.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">属性: {selectedAnalytics.demographic.available ? "available" : "unavailable"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-800 mb-3">メッセージ送信数</h3>
                <div className="grid grid-cols-2 gap-3">
                  {deliveryMetrics.length > 0 ? deliveryMetrics.map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{formatMetricLabel(key)}</p>
                      <p className="text-xl font-semibold text-gray-900">{Number(value).toLocaleString()}</p>
                    </div>
                  )) : <p className="text-sm text-gray-500 col-span-2">この日の送信数はまだ利用できません。</p>}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-3">友だち推移</h3>
                <div className="grid grid-cols-2 gap-3">
                  {followerMetrics.length > 0 ? followerMetrics.map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{formatMetricLabel(key)}</p>
                      <p className="text-xl font-semibold text-gray-900">{Number(value).toLocaleString()}</p>
                    </div>
                  )) : <p className="text-sm text-gray-500 col-span-2">この日の友だち数はまだ利用できません。</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-800 mb-4">友だち属性</h3>
            {selectedAnalytics.demographic.available ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">性別 上位3件</p>
                  <div className="space-y-2">
                    {topGenders.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">年代 上位3件</p>
                  <div className="space-y-2">
                    {topAges.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">地域 上位3件</p>
                  <div className="space-y-2">
                    {topAreas.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium text-gray-900">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                属性情報は利用できません。友だち到達数が20未満、または対象アカウントの国設定が JP / TH / TW 以外の可能性があります。
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

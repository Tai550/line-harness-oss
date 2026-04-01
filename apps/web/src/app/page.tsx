"use client";

import { useEffect, useMemo, useState } from "react";
import type { LineAccountAnalytics } from "@line-crm/shared";
import { api } from "@/lib/api";
import { exportAnalyticsAsCsv, exportAnalyticsAsJson } from "@/lib/analytics-export";
import Link from "next/link";

interface LineAccount {
  id: number;
  name: string;
  channel_id: string;
  is_active: boolean;
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

function firstNumericMetric(source: Record<string, string | number | null | undefined>, candidates: string[]) {
  for (const key of candidates) {
    const value = source[key];
    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [analyticsDate, setAnalyticsDate] = useState(getDefaultInsightDate());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<LineAccountAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [friends, scenarios, broadcasts, templates, automations, scoring, lineAccounts] = await Promise.allSettled([
        api.friends.count(),
        api.scenarios.list(),
        api.broadcasts.list(),
        api.templates.list(),
        api.automations.list(),
        api.scoring.list(),
        api.lineAccounts.list(),
      ]);

      const loadedAccounts =
        lineAccounts.status === "fulfilled" ? (lineAccounts.value as { data: LineAccount[] }).data : [];

      setStats({
        friends: friends.status === "fulfilled" ? (friends.value as { data: { count: number } }).data.count : 0,
        scenarios: scenarios.status === "fulfilled" ? (scenarios.value as { data: unknown[] }).data.length : 0,
        broadcasts: broadcasts.status === "fulfilled" ? (broadcasts.value as { data: unknown[] }).data.length : 0,
        templates: templates.status === "fulfilled" ? (templates.value as { data: unknown[] }).data.length : 0,
        automations: automations.status === "fulfilled" ? (automations.value as { data: unknown[] }).data.length : 0,
        scoring: scoring.status === "fulfilled" ? (scoring.value as { data: unknown[] }).data.length : 0,
      });
      setAccounts(loadedAccounts);

      if (loadedAccounts.length > 0) {
        const activeAccount = loadedAccounts.find((account) => account.is_active) ?? loadedAccounts[0];
        setSelectedAccountId((current) => current ?? activeAccount.id);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (selectedAccountId === null) {
      return;
    }

    const loadAnalytics = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError(null);

      try {
        const response = await api.lineAccounts.analytics(selectedAccountId, analyticsDate);
        setAnalytics(response.data as LineAccountAnalytics);
      } catch (error) {
        setAnalytics(null);
        setAnalyticsError(error instanceof Error ? error.message : "アナリティクス取得に失敗しました");
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [selectedAccountId, analyticsDate]);

  const statCards = [
    { label: "友だち数", value: stats.friends ?? 0, href: "/friends", color: "bg-green-50 text-green-700" },
    { label: "シナリオ", value: stats.scenarios ?? 0, href: "/scenarios", color: "bg-blue-50 text-blue-700" },
    { label: "配信", value: stats.broadcasts ?? 0, href: "/broadcasts", color: "bg-purple-50 text-purple-700" },
    { label: "テンプレート", value: stats.templates ?? 0, href: "/templates", color: "bg-yellow-50 text-yellow-700" },
    { label: "オートメーション", value: stats.automations ?? 0, href: "/automations", color: "bg-orange-50 text-orange-700" },
    { label: "スコアリングルール", value: stats.scoring ?? 0, href: "/scoring", color: "bg-red-50 text-red-700" },
  ];

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const broadcastCount = analytics ? firstNumericMetric(analytics.delivery, ["broadcast", "apiBroadcast"]) : null;
  const followerCount = analytics ? firstNumericMetric(analytics.followers, ["followers"]) : null;
  const reachCount = analytics ? firstNumericMetric(analytics.followers, ["targetedReaches"]) : null;
  const blockCount = analytics ? firstNumericMetric(analytics.followers, ["blocks"]) : null;
  const topArea = analytics?.demographic.areas?.[0];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className={`rounded-xl p-5 ${card.color} hover:opacity-80 transition`}>
            <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
            <p className="text-sm mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">公式アカウント アナリティクス</h2>
            <p className="text-sm text-gray-500">LINE Insight API の前日集計をダッシュボードに要約表示します。</p>
          </div>
          <Link href="/accounts" className="text-sm text-blue-600 hover:text-blue-700">
            詳細を見る
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded px-3 py-2 text-sm md:min-w-64"
          >
            <option value="">アカウントを選択</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={analyticsDate}
            max={getDefaultInsightDate()}
            onChange={(e) => setAnalyticsDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>

        {loadingAnalytics ? <p className="text-sm text-gray-500">アナリティクスを取得中です...</p> : null}
        {analyticsError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{analyticsError}</p> : null}
        {!loadingAnalytics && !analyticsError && !selectedAccount ? (
          <p className="text-sm text-gray-500">先に `LINEアカウント` で対象アカウントを登録してください。</p>
        ) : null}

        {analytics ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{analytics.accountName}</p>
                <p className="text-sm text-gray-500">集計日: {formatInsightDateLabel(analytics.requestedDate)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => exportAnalyticsAsCsv(analytics)}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-100"
                >
                  CSV出力
                </button>
                <button
                  onClick={() => exportAnalyticsAsJson(analytics)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
                >
                  JSON出力
                </button>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">送信数: {analytics.delivery.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">友だち数: {analytics.followers.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">属性: {analytics.demographic.available ? "available" : "unavailable"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">一斉配信数</p>
                <p className="text-2xl font-semibold text-gray-900">{(broadcastCount ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">累計友だち追加</p>
                <p className="text-2xl font-semibold text-gray-900">{(followerCount ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">到達友だち数</p>
                <p className="text-2xl font-semibold text-gray-900">{(reachCount ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">ブロック数</p>
                <p className="text-2xl font-semibold text-gray-900">{(blockCount ?? 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">主要地域</p>
                <p className="text-lg font-semibold text-gray-900">
                  {topArea ? `${String(topArea.area)} ${topArea.percentage}%` : "データなし"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">詳細分析</p>
                <p className="text-sm text-gray-500">
                  性別・年代・地域の内訳や送信チャネル別件数は `LINEアカウント` 画面で確認できます。
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/friends", label: "友だちを管理", icon: "👥" },
          { href: "/broadcasts", label: "配信を作成", icon: "📢" },
          { href: "/scenarios", label: "シナリオを作成", icon: "🔄" },
          { href: "/chats", label: "チャットを確認", icon: "💬" },
          { href: "/automations", label: "自動化を設定", icon: "⚙️" },
          { href: "/health", label: "健全性を確認", icon: "🩺" },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition">
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

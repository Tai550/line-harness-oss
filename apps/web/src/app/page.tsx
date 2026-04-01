"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function firstNumericMetric(source: Record<string, string | number | null | undefined>, candidates: string[]) {
  for (const key of candidates) {
    const value = source[key];
    if (typeof value === "number") return value;
  }
  return null;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [analyticsDate, setAnalyticsDate] = useState(getDefaultInsightDate());
  const [analytics, setAnalytics] = useState<LineAccountAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    api.lineAccounts.list().then((r) => {
      const accts = (r.data ?? []) as LineAccount[];
      setAccounts(accts);
      if (accts.length > 0) {
        const active = accts.find((a) => a.is_active) ?? accts[0];
        setSelectedAccountId(active.id);
      }
    });
  }, []);

  // Load stats filtered by account
  const loadStats = useCallback(async (accountId: number) => {
    setLoadingStats(true);
    const [friends, scenarios, broadcasts, templates, automations, scoring] = await Promise.allSettled([
      api.friends.count(accountId),
      api.scenarios.list(),
      api.broadcasts.list(),
      api.templates.list(),
      api.automations.list(),
      api.scoring.list(),
    ]);
    setStats({
      friends: friends.status === "fulfilled" ? (friends.value as { data: { count: number } }).data.count : 0,
      scenarios: scenarios.status === "fulfilled" ? (scenarios.value as { data: unknown[] }).data.length : 0,
      broadcasts: broadcasts.status === "fulfilled" ? (broadcasts.value as { data: unknown[] }).data.length : 0,
      templates: templates.status === "fulfilled" ? (templates.value as { data: unknown[] }).data.length : 0,
      automations: automations.status === "fulfilled" ? (automations.value as { data: unknown[] }).data.length : 0,
      scoring: scoring.status === "fulfilled" ? (scoring.value as { data: unknown[] }).data.length : 0,
    });
    setLoadingStats(false);
  }, []);

  // Load analytics for selected account
  const loadAnalytics = useCallback(async (accountId: number, date: string) => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const response = await api.lineAccounts.analytics(accountId, date);
      setAnalytics(response.data as LineAccountAnalytics);
    } catch (error) {
      setAnalytics(null);
      setAnalyticsError(error instanceof Error ? error.message : "アナリティクス取得に失敗しました");
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Re-fetch when account changes
  useEffect(() => {
    if (selectedAccountId === null) return;
    loadStats(selectedAccountId);
    loadAnalytics(selectedAccountId, analyticsDate);
  }, [selectedAccountId, loadStats, loadAnalytics, analyticsDate]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const statCards = [
    { label: "友だち数", value: stats.friends ?? 0, href: "/friends", bg: "bg-brand-orange/8", text: "text-brand-orange" },
    { label: "シナリオ", value: stats.scenarios ?? 0, href: "/scenarios", bg: "bg-brand-blue/8", text: "text-brand-blue" },
    { label: "配信", value: stats.broadcasts ?? 0, href: "/broadcasts", bg: "bg-brand-gold/10", text: "text-brand-black" },
    { label: "テンプレート", value: stats.templates ?? 0, href: "/templates", bg: "bg-brand-lightgray", text: "text-brand-black" },
    { label: "オートメーション", value: stats.automations ?? 0, href: "/automations", bg: "bg-brand-green/8", text: "text-brand-green" },
    { label: "スコアリングルール", value: stats.scoring ?? 0, href: "/scoring", bg: "bg-brand-skyblue/10", text: "text-brand-blue" },
  ];

  const broadcastCount = analytics ? firstNumericMetric(analytics.delivery, ["broadcast", "apiBroadcast"]) : null;
  const followerCount = analytics ? firstNumericMetric(analytics.followers, ["followers"]) : null;
  const reachCount = analytics ? firstNumericMetric(analytics.followers, ["targetedReaches"]) : null;
  const blockCount = analytics ? firstNumericMetric(analytics.followers, ["blocks"]) : null;
  const topArea = analytics?.demographic.areas?.[0];

  return (
    <div>
      {/* Header with account switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-brand-black">ダッシュボード</h1>
        <select
          value={selectedAccountId ?? ""}
          onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
          className="border border-brand-lightgray rounded-[6px] px-3 py-2 text-sm md:min-w-56 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedAccount && (
        <p className="text-sm text-brand-gray py-12 text-center">
          先に「LINEアカウント」で対象アカウントを登録してください。
        </p>
      )}

      {selectedAccount && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map((card) => (
              <Link key={card.label} href={card.href} className={`rounded-[8px] p-5 ${card.bg} hover:opacity-80 transition ${loadingStats ? "animate-pulse" : ""}`}>
                <p className={`text-3xl font-bold kpi-number ${card.text}`}>{card.value.toLocaleString()}</p>
                <p className="text-sm mt-1 text-brand-black/60">{card.label}</p>
              </Link>
            ))}
          </div>

          {/* Analytics section */}
          <div className="bg-white rounded-[8px] shadow-sm p-5 mb-8 brand-section-top">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-brand-black">アナリティクス</h2>
                <p className="text-sm text-brand-gray">LINE Insight API の前日集計</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={analyticsDate}
                  max={getDefaultInsightDate()}
                  onChange={(e) => setAnalyticsDate(e.target.value)}
                  className="border border-brand-lightgray rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
                <Link href="/analytics" className="text-sm text-brand-orange hover:text-brand-orange/80 font-medium whitespace-nowrap">
                  詳細 →
                </Link>
              </div>
            </div>

            {loadingAnalytics && <p className="text-sm text-brand-gray">取得中...</p>}
            {analyticsError && <p className="rounded-[6px] bg-brand-alert/8 px-3 py-2 text-sm text-brand-alert">{analyticsError}</p>}

            {analytics && !loadingAnalytics && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <p className="text-sm text-brand-gray">集計日: {formatInsightDateLabel(analytics.requestedDate)}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => exportAnalyticsAsCsv(analytics)}
                      className="rounded-[6px] bg-brand-green/10 px-3 py-1.5 text-brand-green hover:bg-brand-green/15 font-medium"
                    >
                      CSV出力
                    </button>
                    <button
                      onClick={() => exportAnalyticsAsJson(analytics)}
                      className="rounded-[6px] bg-brand-lightgray px-3 py-1.5 text-brand-black/70 hover:bg-brand-gray/20 font-medium"
                    >
                      JSON出力
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-[8px] bg-brand-highlight p-4">
                    <p className="text-xs text-brand-gray">一斉配信数</p>
                    <p className="text-2xl font-semibold kpi-number text-brand-black">{(broadcastCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-[8px] bg-brand-highlight p-4">
                    <p className="text-xs text-brand-gray">累計友だち追加</p>
                    <p className="text-2xl font-semibold kpi-number text-brand-black">{(followerCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-[8px] bg-brand-highlight p-4">
                    <p className="text-xs text-brand-gray">到達友だち数</p>
                    <p className="text-2xl font-semibold kpi-number text-brand-black">{(reachCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-[8px] bg-brand-highlight p-4">
                    <p className="text-xs text-brand-gray">ブロック数</p>
                    <p className="text-2xl font-semibold kpi-number text-brand-black">{(blockCount ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-[8px] border border-brand-lightgray p-4">
                    <p className="text-sm font-medium text-brand-black/70 mb-1">主要地域</p>
                    <p className="text-lg font-semibold text-brand-black">
                      {topArea ? `${String(topArea.area)} ${topArea.percentage}%` : "データなし"}
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-brand-lightgray p-4">
                    <p className="text-sm font-medium text-brand-black/70 mb-1">詳細分析</p>
                    <p className="text-sm text-brand-gray">
                      性別・年代・地域の内訳は「LINEアカウント」画面で確認できます。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { href: "/friends", label: "友だちを管理", icon: "👥" },
              { href: "/broadcasts", label: "配信を作成", icon: "📢" },
              { href: "/scenarios", label: "シナリオを作成", icon: "🔄" },
              { href: "/chats", label: "チャットを確認", icon: "💬" },
              { href: "/automations", label: "自動化を設定", icon: "⚙️" },
              { href: "/health", label: "健全性を確認", icon: "🩺" },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="bg-white rounded-[8px] p-4 flex items-center gap-3 shadow-sm hover:shadow transition border border-brand-lightgray/50">
                <span className="text-2xl">{action.icon}</span>
                <span className="text-sm font-medium text-brand-black/80">{action.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

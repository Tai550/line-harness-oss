"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface LineAccount {
  id: number;
  name: string;
  channel_id: string;
  is_active: boolean;
}

interface MessageLogDailySummary {
  date: string;
  inbound_total: number;
  outbound_total: number;
  inbound_by_type: Record<string, number>;
  outbound_by_type: Record<string, number>;
}

interface InsightCountResponse {
  status: string;
  [key: string]: number | string | null | undefined;
}

interface MessageAnalyticsResponse {
  accountId: number;
  accountName: string;
  dateFrom: string;
  dateTo: string;
  insightDelivery: Record<string, InsightCountResponse>;
  insightFollowers: Record<string, InsightCountResponse>;
  localMessages: MessageLogDailySummary[];
}

function getDefaultDateRange() {
  const to = new Date();
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatDateKey(yyyymmdd: string): string {
  if (/^\d{8}$/.test(yyyymmdd)) {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}

function sumDeliveryMetrics(delivery: InsightCountResponse): number {
  let total = 0;
  for (const [key, value] of Object.entries(delivery)) {
    if (key !== "status" && typeof value === "number") {
      total += value;
    }
  }
  return total;
}

function formatShortDate(date: string): string {
  return date.slice(5);
}

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [data, setData] = useState<MessageAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);
    api.analytics
      .messages(selectedAccountId, dateRange.from, dateRange.to)
      .then((r) => setData(r.data as MessageAnalyticsResponse))
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [selectedAccountId, dateRange]);

  const summary = useMemo(() => {
    if (!data) return null;
    let totalInbound = 0;
    let totalOutbound = 0;
    let totalInsightDelivery = 0;
    const inboundByType: Record<string, number> = {};
    const outboundByType: Record<string, number> = {};

    for (const day of data.localMessages) {
      totalInbound += day.inbound_total;
      totalOutbound += day.outbound_total;
      for (const [type, count] of Object.entries(day.inbound_by_type)) {
        inboundByType[type] = (inboundByType[type] ?? 0) + count;
      }
      for (const [type, count] of Object.entries(day.outbound_by_type)) {
        outboundByType[type] = (outboundByType[type] ?? 0) + count;
      }
    }

    for (const delivery of Object.values(data.insightDelivery)) {
      totalInsightDelivery += sumDeliveryMetrics(delivery);
    }

    return { totalInbound, totalOutbound, totalInsightDelivery, inboundByType, outboundByType };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const dayMap = new Map<string, { date: string; inbound: number; outbound: number; insightDelivery: number }>();

    for (const day of data.localMessages) {
      dayMap.set(day.date, {
        date: day.date,
        inbound: day.inbound_total,
        outbound: day.outbound_total,
        insightDelivery: 0,
      });
    }

    for (const [yyyymmdd, delivery] of Object.entries(data.insightDelivery)) {
      const dateKey = formatDateKey(yyyymmdd);
      const existing = dayMap.get(dateKey) ?? { date: dateKey, inbound: 0, outbound: 0, insightDelivery: 0 };
      existing.insightDelivery = sumDeliveryMetrics(delivery);
      dayMap.set(dateKey, existing);
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const maxBarValue = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => Math.max(d.inbound, d.insightDelivery)));
  }, [chartData]);

  const handleExportCSV = () => {
    if (!chartData.length) return;
    const rows = [["日付", "送信数(LINE)", "受信数(ローカル)"]];
    for (const day of chartData) {
      rows.push([day.date, String(day.insightDelivery), String(day.inbound)]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📊 メッセージ分析</h1>
        {chartData.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
          >
            CSV出力
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value) || null)}
            className="border rounded-lg px-3 py-2 text-sm md:min-w-64 focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
          >
            <option value="">アカウントを選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={dateRange.to}
              max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 mb-4">データを取得中...</p>}
      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{error}</p>}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-xs text-blue-600 mb-1">送信数（LINE公式）</p>
            <p className="text-3xl font-bold text-blue-700">{summary.totalInsightDelivery.toLocaleString()}</p>
            <p className="text-xs text-blue-400 mt-1">LINE Insight API集計</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 p-5">
            <p className="text-xs text-green-600 mb-1">送信数（ローカル記録）</p>
            <p className="text-3xl font-bold text-green-700">{summary.totalOutbound.toLocaleString()}</p>
            <p className="text-xs text-green-400 mt-1">アプリ経由の送信</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-100 p-5">
            <p className="text-xs text-purple-600 mb-1">受信数</p>
            <p className="text-3xl font-bold text-purple-700">{summary.totalInbound.toLocaleString()}</p>
            <p className="text-xs text-purple-400 mt-1">ユーザーからのメッセージ</p>
          </div>
        </div>
      )}

      {/* Daily chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">日別推移</h2>
          <div className="space-y-3">
            {chartData.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14 shrink-0 font-mono">{formatShortDate(day.date)}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-500 w-8 shrink-0">送信</span>
                    <div className="flex-1 bg-gray-50 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all"
                        style={{
                          width: `${(day.insightDelivery / maxBarValue) * 100}%`,
                          minWidth: day.insightDelivery > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-12 text-right font-mono">{day.insightDelivery.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-500 w-8 shrink-0">受信</span>
                    <div className="flex-1 bg-gray-50 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-400 transition-all"
                        style={{
                          width: `${(day.inbound / maxBarValue) * 100}%`,
                          minWidth: day.inbound > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-12 text-right font-mono">{day.inbound.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> 送信（LINE Insight）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> 受信（ローカル）
            </span>
          </div>
        </div>
      )}

      {/* Type breakdown */}
      {summary && (Object.keys(summary.inboundByType).length > 0 || Object.keys(summary.outboundByType).length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">受信メッセージ種別</h3>
            {Object.entries(summary.inboundByType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(summary.inboundByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-sm">
                      <span className="text-gray-700">{type}</span>
                      <span className="font-medium text-purple-700">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">データなし</p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">送信メッセージ種別</h3>
            {Object.entries(summary.outboundByType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(summary.outboundByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
                      <span className="text-gray-700">{type}</span>
                      <span className="font-medium text-blue-700">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">データなし</p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && !data && selectedAccountId && (
        <div className="text-center py-12 text-gray-400">
          <p>データを読み込んでいます...</p>
        </div>
      )}

      {!loading && !selectedAccountId && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">アカウントを選択してください</p>
          <p className="text-sm">LINEアカウントを選択すると、メッセージの送受信データが表示されます</p>
        </div>
      )}
    </div>
  );
}

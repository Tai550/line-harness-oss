"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Automation {
  id: number;
  name: string;
  trigger_event: string;
  conditions: string;
  actions: string;
  is_active: boolean;
  priority: number;
}

interface AutomationLog {
  id: number;
  friend_id: number | null;
  trigger_event: string;
  actions_executed: string;
  status: string;
  error: string | null;
  created_at: string;
}

export default function AutomationDetailPage() {
  const searchParams = useSearchParams();
  const automationId = Number(searchParams.get("id"));

  const [automation, setAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("friend_add");
  const [conditions, setConditions] = useState("[]");
  const [actions, setActions] = useState("[]");
  const [priority, setPriority] = useState("0");

  const load = async () => {
    if (!Number.isFinite(automationId)) {
      setError("オートメーションIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [automationResponse, logsResponse] = await Promise.all([
        api.automations.get(automationId),
        api.automations.logs(automationId),
      ]);
      const data = automationResponse.data as Automation;
      setAutomation(data);
      setLogs(logsResponse.data as AutomationLog[]);
      setName(data.name);
      setTriggerEvent(data.trigger_event);
      setConditions(data.conditions);
      setActions(data.actions);
      setPriority(String(data.priority));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [automationId]);

  if (!Number.isFinite(automationId)) {
    return <div className="text-sm text-red-500">オートメーションIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">オートメーション詳細</h1>
          <p className="text-sm text-gray-500">条件・アクション JSON と実行ログを管理します。</p>
        </div>
        <Link href="/automations" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {automation ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ルール名" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid md:grid-cols-3 gap-3">
              <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="friend_add">friend_add</option>
                <option value="tag_change">tag_change</option>
                <option value="message_received">message_received</option>
                <option value="conversion">conversion</option>
              </select>
              <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="優先度" className="border rounded px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  await api.automations.update(automation.id, { isActive: !automation.is_active });
                  await load();
                }}
                className={`px-4 py-2 rounded text-sm ${automation.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {automation.is_active ? "有効" : "無効"}
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">条件 JSON</label>
              <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={4} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">アクション JSON</label>
              <textarea value={actions} onChange={(e) => setActions(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            </div>
            <button
              onClick={async () => {
                await api.automations.update(automation.id, {
                  name,
                  triggerEvent,
                  conditions,
                  actions,
                  priority: Number(priority),
                });
                await load();
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
            >
              保存
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">実行ログ</h2>
            {logs.length === 0 ? <p className="text-sm text-gray-500">ログはまだありません。</p> : null}
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`rounded px-2 py-1 text-xs ${log.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{log.status}</span>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{log.trigger_event}</span>
                  <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString("ja-JP")}</span>
                  {log.friend_id ? <span className="text-xs text-gray-400">friend_id: {log.friend_id}</span> : null}
                </div>
                <pre className="overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-700">{log.actions_executed}</pre>
                {log.error ? <p className="mt-2 text-sm text-red-600">{log.error}</p> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface NotificationRule {
  id: number;
  name: string;
  trigger_event: string;
  channels: string;
  message_template: string;
  is_active: boolean;
}

interface Notification {
  id: number;
  channel: string;
  message: string;
  status: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("friend_add");
  const [channels, setChannels] = useState('["email"]');
  const [messageTemplate, setMessageTemplate] = useState("{{display_name}}さんが友だち追加しました");
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    const [rulesResponse, notificationsResponse] = await Promise.all([
      api.notifications.rules(),
      api.notifications.list(statusFilter || undefined),
    ]);
    setRules(rulesResponse.data as NotificationRule[]);
    setNotifications(notificationsResponse.data as Notification[]);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const create = async () => {
    if (!name) return;
    await api.notifications.createRule({ name, triggerEvent, channels, messageTemplate });
    setName("");
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">通知ルール</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ルール名" className="w-full border rounded px-3 py-2 text-sm" />
        <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          <option value="friend_add">友だち追加</option>
          <option value="conversion">コンバージョン</option>
          <option value="tag_change">タグ変更</option>
        </select>
        <input value={channels} onChange={(e) => setChannels(e.target.value)} placeholder='チャンネル (例: ["email","slack"])' className="w-full border rounded px-3 py-2 text-sm font-mono" />
        <input value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} placeholder="メッセージテンプレート" className="w-full border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">作成</button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{rule.name}</h3>
                <p className="text-xs text-gray-400">{rule.trigger_event} → {rule.channels}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await api.notifications.updateRule(rule.id, { isActive: !rule.is_active });
                    await load();
                  }}
                  className={`text-sm px-3 py-1 rounded ${rule.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                >
                  {rule.is_active ? "有効" : "無効"}
                </button>
                <button onClick={() => api.notifications.deleteRule(rule.id).then(load)} className="text-sm text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
            <input
              defaultValue={rule.message_template}
              className="w-full border rounded px-3 py-2 text-sm"
              onBlur={async (e) => {
                if (e.target.value !== rule.message_template) {
                  await api.notifications.updateRule(rule.id, { messageTemplate: e.target.value, channels: rule.channels, name: rule.name });
                  await load();
                }
              }}
            />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">通知履歴</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">すべて</option>
            <option value="pending">pending</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{notification.channel}</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{notification.status}</span>
                <span className="text-xs text-gray-400">{new Date(notification.created_at).toLocaleString("ja-JP")}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notification.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

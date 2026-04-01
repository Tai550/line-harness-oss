"use client";

import { useEffect, useState } from "react";
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

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("friend_add");
  const [conditions, setConditions] = useState("[]");
  const [actions, setActions] = useState('[{"type":"send_message","message":"こんにちは！"}]');
  const [loading, setLoading] = useState(true);

  const load = () => api.automations.list().then((r) => { setAutomations(r.data as Automation[]); setLoading(false); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return;
    await api.automations.create({ name, triggerEvent, conditions, actions });
    setName(""); load();
  };

  const toggle = async (a: Automation) => {
    await api.automations.update(a.id, { isActive: !a.is_active });
    load();
  };

  const del = async (id: number) => {
    if (confirm("削除しますか？")) { await api.automations.delete(id); load(); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-6">オートメーション</h1>

      <div className="bg-white rounded-[8px] shadow-sm p-4 mb-6 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ルール名" className="w-full border rounded px-3 py-2 text-sm" />
        <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          <option value="friend_add">友だち追加</option>
          <option value="tag_change">タグ変更</option>
          <option value="message_received">メッセージ受信</option>
          <option value="conversion">コンバージョン</option>
        </select>
        <div>
          <label className="text-xs text-brand-gray">条件 (JSON)</label>
          <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-brand-gray">アクション (JSON)</label>
          <textarea value={actions} onChange={(e) => setActions(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm font-mono" />
        </div>
        <button onClick={create} className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange">作成</button>
      </div>

      {loading ? <p className="text-brand-gray/70">読み込み中...</p> : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="bg-white rounded-[8px] shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{a.name}</h3>
                  <span className="text-xs bg-brand-lightgray text-brand-black/80 px-2 py-0.5 rounded">{a.trigger_event}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${a.is_active ? "bg-brand-orange/8 text-brand-orange" : "bg-brand-lightgray text-brand-gray"}`}>{a.is_active ? "有効" : "無効"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/automations/detail?id=${a.id}`} className="text-sm text-brand-blue hover:underline">編集</a>
                <button onClick={() => toggle(a)} className="text-sm text-brand-gray hover:text-brand-black/80">{a.is_active ? "無効化" : "有効化"}</button>
                <button onClick={() => del(a.id)} className="text-sm text-brand-alert/60 hover:text-brand-alert">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

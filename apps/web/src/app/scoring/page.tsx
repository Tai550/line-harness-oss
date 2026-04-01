"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ScoringRule {
  id: number;
  name: string;
  event_type: string;
  score_delta: number;
  is_active: boolean;
}

export default function ScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("friend_add");
  const [scoreDelta, setScoreDelta] = useState("10");

  const load = () => api.scoring.list().then((r) => setRules(r.data as ScoringRule[]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return;
    await api.scoring.create({ name, eventType, scoreDelta: Number(scoreDelta) });
    setName(""); load();
  };

  const toggle = async (rule: ScoringRule) => {
    await api.scoring.update(rule.id, { isActive: !rule.is_active });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">スコアリング</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ルール名" className="flex-1 border rounded px-3 py-2 text-sm" />
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="friend_add">友だち追加</option>
          <option value="message_received">メッセージ</option>
          <option value="conversion">コンバージョン</option>
        </select>
        <input type="number" value={scoreDelta} onChange={(e) => setScoreDelta(e.target.value)} placeholder="スコア" className="w-24 border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">追加</button>
      </div>

      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${r.score_delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                {r.score_delta >= 0 ? "+" : ""}{r.score_delta}
              </span>
              <div>
                <h3 className="font-medium">{r.name}</h3>
                <p className="text-xs text-gray-400">{r.event_type}</p>
              </div>
            </div>
            <button onClick={() => toggle(r)} className={`text-sm px-2 py-1 rounded ${r.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
              {r.is_active ? "有効" : "無効"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

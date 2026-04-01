"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Scenario {
  id: number;
  name: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("manual");
  const [loading, setLoading] = useState(true);

  const load = () => api.scenarios.list().then((r) => { setScenarios(r.data as Scenario[]); setLoading(false); });

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    await api.scenarios.create({ name, triggerType });
    setName("");
    load();
  };

  const toggle = async (scenario: Scenario) => {
    await api.scenarios.update(scenario.id, { isActive: !scenario.is_active });
    load();
  };

  const del = async (id: number) => {
    if (confirm("削除しますか？")) { await api.scenarios.delete(id); load(); }
  };

  const triggerLabel = (t: string) => ({ friend_add: "友だち追加", tag_added: "タグ付与", manual: "手動" }[t] ?? t);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ステップ配信</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="シナリオ名" className="flex-1 border rounded px-3 py-2 text-sm" />
        <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="manual">手動</option>
          <option value="friend_add">友だち追加</option>
          <option value="tag_added">タグ付与</option>
        </select>
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">作成</button>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : (
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{s.name}</h3>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{triggerLabel(s.trigger_type)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {s.is_active ? "有効" : "無効"}
                  </span>
                </div>
                {s.description && <p className="text-sm text-gray-500 mt-1">{s.description}</p>}
              </div>
              <div className="flex gap-2">
                <a href={`/scenarios/detail?id=${s.id}`} className="text-sm text-blue-500 hover:underline">編集</a>
                <button onClick={() => toggle(s)} className="text-sm text-gray-500 hover:text-gray-700">{s.is_active ? "無効化" : "有効化"}</button>
                <button onClick={() => del(s.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

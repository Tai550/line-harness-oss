"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Reminder {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = () => api.reminders.list().then((r) => setReminders(r.data as Reminder[]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return;
    await api.reminders.create({ name, description: description || undefined });
    setName(""); setDescription(""); load();
  };

  const del = async (id: number) => {
    if (confirm("削除しますか？")) { await api.reminders.delete(id); load(); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">リマインダー</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="リマインダー名" className="w-full border rounded px-3 py-2 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明 (任意)" className="w-full border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">作成</button>
      </div>

      <div className="space-y-3">
        {reminders.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{r.name}</h3>
              {r.description && <p className="text-sm text-gray-400">{r.description}</p>}
            </div>
            <div className="flex gap-2">
              <a href={`/reminders/detail?id=${r.id}`} className="text-sm text-blue-500 hover:underline">編集</a>
              <button onClick={() => del(r.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

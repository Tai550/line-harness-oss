"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Broadcast {
  id: number;
  title: string;
  message_type: string;
  status: string;
  target_type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_count: number;
  success_count: number;
  created_at: string;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => api.broadcasts.list().then((r) => { setBroadcasts(r.data as Broadcast[]); setLoading(false); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !content) return;
    await api.broadcasts.create({ title, messageType: "text", messageContent: content, targetType });
    setTitle(""); setContent(""); load();
  };

  const send = async (id: number) => {
    if (confirm("送信しますか？")) { await api.broadcasts.send(id); load(); }
  };

  const del = async (id: number) => {
    if (confirm("削除しますか？")) { await api.broadcasts.delete(id); load(); }
  };

  const statusLabel = (s: string) => ({ draft: "下書き", scheduled: "予約済", sending: "送信中", sent: "送信済", failed: "失敗" }[s] ?? s);
  const statusColor = (s: string) => ({ draft: "bg-gray-100 text-gray-600", scheduled: "bg-blue-100 text-blue-600", sending: "bg-yellow-100 text-yellow-600", sent: "bg-green-100 text-green-600", failed: "bg-red-100 text-red-600" }[s] ?? "");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">一斉配信</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="配信タイトル" className="w-full border rounded px-3 py-2 text-sm" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="メッセージ内容" rows={3} className="w-full border rounded px-3 py-2 text-sm" />
        <div className="flex gap-3">
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="all">全員</option>
            <option value="tag">タグ絞込</option>
          </select>
          <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">作成</button>
        </div>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{b.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor(b.status)}`}>{statusLabel(b.status)}</span>
                  </div>
                  {b.status === "sent" && (
                    <p className="text-xs text-gray-400 mt-1">{b.success_count}/{b.total_count} 件送信完了</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <a href={`/broadcasts/detail?id=${b.id}`} className="text-sm text-blue-500 hover:underline">編集</a>
                  {b.status === "draft" && (
                    <button onClick={() => send(b.id)} className="text-sm bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600">送信</button>
                  )}
                  <button onClick={() => del(b.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

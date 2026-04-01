"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface BroadcastDetail {
  id: number;
  title: string;
  message_type: string;
  message_content: string;
  target_type: string;
  scheduled_at: string | null;
  status: string;
  total_count: number;
  success_count: number;
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export default function BroadcastDetailPage() {
  const searchParams = useSearchParams();
  const broadcastId = Number(searchParams.get("id"));

  const [broadcast, setBroadcast] = useState<BroadcastDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [messageContent, setMessageContent] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [scheduledAt, setScheduledAt] = useState("");

  const load = async () => {
    if (!Number.isFinite(broadcastId)) {
      setError("配信IDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.broadcasts.get(broadcastId);
      const data = response.data as BroadcastDetail;
      setBroadcast(data);
      setTitle(data.title);
      setMessageType(data.message_type);
      setMessageContent(data.message_content);
      setTargetType(data.target_type);
      setScheduledAt(toDatetimeLocal(data.scheduled_at));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [broadcastId]);

  if (!Number.isFinite(broadcastId)) {
    return <div className="text-sm text-brand-alert">配信IDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">配信詳細</h1>
          <p className="text-sm text-brand-gray">配信内容の編集、予約設定、手動送信を行います。</p>
        </div>
        <Link href="/broadcasts" className="text-sm text-brand-orange hover:text-brand-blue">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-brand-gray/70">読み込み中...</p> : null}
      {error ? <p className="rounded-[6px] bg-brand-alert/8 px-4 py-3 text-sm text-brand-alert">{error}</p> : null}

      {broadcast ? (
        <>
          <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-brand-lightgray px-2 py-1 text-xs text-brand-black/60">status: {broadcast.status}</span>
              <span className="rounded bg-brand-lightgray px-2 py-1 text-xs text-brand-black/60">total: {broadcast.total_count}</span>
              <span className="rounded bg-brand-lightgray px-2 py-1 text-xs text-brand-black/60">success: {broadcast.success_count}</span>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="配信タイトル" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid md:grid-cols-3 gap-3">
              <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="flex">flex</option>
              </select>
              <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="all">all</option>
                <option value="tag">tag</option>
                <option value="segment">segment</option>
              </select>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="border rounded px-3 py-2 text-sm" />
            </div>
            <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} rows={6} placeholder="メッセージ内容" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await api.broadcasts.update(broadcast.id, {
                    title,
                    messageType,
                    messageContent,
                    targetType,
                    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                  });
                  await load();
                }}
                className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange"
              >
                保存
              </button>
              <button
                onClick={async () => {
                  await api.broadcasts.send(broadcast.id);
                  alert("送信を開始しました");
                  await load();
                }}
                className="bg-brand-blue text-white px-4 py-2 rounded text-sm hover:bg-brand-blue"
              >
                即時送信
              </button>
              <button
                onClick={async () => {
                  await api.broadcasts.sendSegment(broadcast.id);
                  alert("セグメント送信を開始しました");
                  await load();
                }}
                className="bg-brand-black/80 text-white px-4 py-2 rounded text-sm hover:bg-brand-black"
              >
                セグメント送信
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

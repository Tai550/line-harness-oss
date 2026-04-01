"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface ReminderStep {
  id: number;
  step_order: number;
  offset_minutes: number;
  message_type: string;
  message_content: string;
}

interface ReminderDetail {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  steps: ReminderStep[];
}

interface Friend {
  id: number;
  display_name: string;
}

function defaultTargetDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReminderDetailPage() {
  const searchParams = useSearchParams();
  const reminderId = Number(searchParams.get("id"));

  const [reminder, setReminder] = useState<ReminderDetail | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepOrder, setStepOrder] = useState("1");
  const [offsetMinutes, setOffsetMinutes] = useState("0");
  const [messageType, setMessageType] = useState("text");
  const [messageContent, setMessageContent] = useState("");
  const [friendId, setFriendId] = useState("");
  const [targetDate, setTargetDate] = useState(defaultTargetDate());

  const load = async () => {
    if (!Number.isFinite(reminderId)) {
      setError("リマインダーIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [reminderResponse, friendsResponse] = await Promise.all([
        api.reminders.get(reminderId),
        api.friends.list("limit=100&offset=0"),
      ]);
      const data = reminderResponse.data as ReminderDetail;
      setReminder(data);
      setName(data.name);
      setDescription(data.description ?? "");
      setFriends(friendsResponse.data as Friend[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reminderId]);

  if (!Number.isFinite(reminderId)) {
    return <div className="text-sm text-red-500">リマインダーIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">リマインダー詳細</h1>
          <p className="text-sm text-gray-500">本体編集、ステップ管理、友だちへの enroll を行います。</p>
        </div>
        <Link href="/reminders" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {reminder ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="リマインダー名" className="w-full border rounded px-3 py-2 text-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="説明" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await api.reminders.update(reminder.id, { name, description, isActive: reminder.is_active });
                  await load();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
              >
                保存
              </button>
              <button
                onClick={async () => {
                  await api.reminders.update(reminder.id, { isActive: !reminder.is_active });
                  await load();
                }}
                className={`px-4 py-2 rounded text-sm ${reminder.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {reminder.is_active ? "有効" : "無効"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">ステップ追加</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="number" value={stepOrder} onChange={(e) => setStepOrder(e.target.value)} placeholder="順番" className="border rounded px-3 py-2 text-sm" />
              <input type="number" value={offsetMinutes} onChange={(e) => setOffsetMinutes(e.target.value)} placeholder="オフセット分" className="border rounded px-3 py-2 text-sm" />
              <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="flex">flex</option>
              </select>
            </div>
            <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} rows={3} placeholder="メッセージ内容" className="w-full border rounded px-3 py-2 text-sm" />
            <button
              onClick={async () => {
                if (!messageContent.trim()) return;
                await api.reminders.addStep(reminder.id, {
                  stepOrder: Number(stepOrder),
                  offsetMinutes: Number(offsetMinutes),
                  messageType,
                  messageContent,
                });
                setStepOrder(String((reminder.steps.at(-1)?.step_order ?? 0) + 2));
                setOffsetMinutes("0");
                setMessageType("text");
                setMessageContent("");
                await load();
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
            >
              ステップ追加
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-gray-800">ステップ一覧</h2>
            {reminder.steps.length === 0 ? <p className="text-sm text-gray-500">まだステップがありません。</p> : null}
            {reminder.steps.map((step) => (
              <div key={step.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">STEP {step.step_order}</span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{step.message_type}</span>
                    <span className="text-xs text-gray-400">{step.offset_minutes} 分</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("このステップを削除しますか？")) return;
                      await api.reminders.deleteStep(reminder.id, step.id);
                      await load();
                    }}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
                <textarea
                  defaultValue={step.message_content}
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm"
                  onBlur={async (e) => {
                    if (e.target.value !== step.message_content) {
                      await api.reminders.updateStep(reminder.id, step.id, { messageContent: e.target.value });
                      await load();
                    }
                  }}
                />
                <input
                  type="number"
                  defaultValue={step.offset_minutes}
                  className="border rounded px-3 py-2 text-sm"
                  onBlur={async (e) => {
                    const value = Number(e.target.value);
                    if (value !== step.offset_minutes) {
                      await api.reminders.updateStep(reminder.id, step.id, { offsetMinutes: value });
                      await load();
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">友だちへ enroll</h2>
            <div className="grid md:grid-cols-[minmax(0,1fr)_180px_auto] gap-3">
              <select value={friendId} onChange={(e) => setFriendId(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="">友だちを選択</option>
                {friends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.display_name}
                  </option>
                ))}
              </select>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  if (!friendId || !targetDate) return;
                  await api.reminders.enroll(reminder.id, Number(friendId), targetDate);
                  alert("リマインダーに enroll しました");
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600"
              >
                enroll
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

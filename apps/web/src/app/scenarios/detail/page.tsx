"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface ScenarioStep {
  id: number;
  step_order: number;
  delay_minutes: number;
  message_type: string;
  message_content: string;
  condition_type: string | null;
  condition_value: string | null;
  next_step_on_false: number | null;
}

interface ScenarioDetail {
  id: number;
  name: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean;
  steps: ScenarioStep[];
}

interface Friend {
  id: number;
  display_name: string;
}

export default function ScenarioDetailPage() {
  const searchParams = useSearchParams();
  const scenarioId = Number(searchParams.get("id"));

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepOrder, setStepOrder] = useState("1");
  const [delayMinutes, setDelayMinutes] = useState("0");
  const [messageType, setMessageType] = useState("text");
  const [messageContent, setMessageContent] = useState("");
  const [conditionType, setConditionType] = useState("");
  const [conditionValue, setConditionValue] = useState("");
  const [nextStepOnFalse, setNextStepOnFalse] = useState("");
  const [friendId, setFriendId] = useState("");

  const load = async () => {
    if (!Number.isFinite(scenarioId)) {
      setError("シナリオIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [scenarioResponse, friendsResponse] = await Promise.all([
        api.scenarios.get(scenarioId),
        api.friends.list("limit=100&offset=0"),
      ]);
      const data = scenarioResponse.data as ScenarioDetail;
      setScenario(data);
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
  }, [scenarioId]);

  const saveScenario = async () => {
    if (!scenario) return;
    setSaving(true);
    try {
      await api.scenarios.update(scenario.id, { name, description, isActive: scenario.is_active });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const createStep = async () => {
    if (!scenario || !messageContent.trim()) return;
    await api.scenarios.addStep(scenario.id, {
      stepOrder: Number(stepOrder),
      delayMinutes: Number(delayMinutes),
      messageType,
      messageContent,
      conditionType: conditionType || undefined,
      conditionValue: conditionValue || undefined,
      nextStepOnFalse: nextStepOnFalse ? Number(nextStepOnFalse) : undefined,
    });
    setStepOrder(String((scenario.steps.at(-1)?.step_order ?? 0) + 2));
    setDelayMinutes("0");
    setMessageType("text");
    setMessageContent("");
    setConditionType("");
    setConditionValue("");
    setNextStepOnFalse("");
    await load();
  };

  const updateStep = async (step: ScenarioStep, patch: Partial<{ delayMinutes: number; messageContent: string; stepOrder: number; conditionType: string; conditionValue: string; nextStepOnFalse: number | null }>) => {
    if (!scenario) return;
    await api.scenarios.updateStep(scenario.id, step.id, patch);
    await load();
  };

  const deleteStep = async (stepId: number) => {
    if (!scenario || !confirm("このステップを削除しますか？")) return;
    await api.scenarios.deleteStep(scenario.id, stepId);
    await load();
  };

  if (!Number.isFinite(scenarioId)) {
    return <div className="text-sm text-red-500">シナリオIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">シナリオ詳細</h1>
          <p className="text-sm text-gray-500">ステップ配信の編集、ステップ追加、手動 enroll を行います。</p>
        </div>
        <Link href="/scenarios" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {scenario ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="シナリオ名" className="border rounded px-3 py-2 text-sm" />
              <input value={scenario.trigger_type} readOnly className="border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500" />
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="説明" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={saveScenario} disabled={saving} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50">
                {saving ? "保存中..." : "シナリオを保存"}
              </button>
              <button
                onClick={async () => {
                  await api.scenarios.update(scenario.id, { isActive: !scenario.is_active });
                  await load();
                }}
                className={`px-4 py-2 rounded text-sm ${scenario.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {scenario.is_active ? "有効" : "無効"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">ステップ追加</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <input type="number" value={stepOrder} onChange={(e) => setStepOrder(e.target.value)} placeholder="順番" className="border rounded px-3 py-2 text-sm" />
              <input type="number" value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)} placeholder="遅延分" className="border rounded px-3 py-2 text-sm" />
              <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="flex">flex</option>
              </select>
            </div>
            <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} rows={3} placeholder="メッセージ内容" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid md:grid-cols-3 gap-3">
              <input value={conditionType} onChange={(e) => setConditionType(e.target.value)} placeholder="条件タイプ (任意)" className="border rounded px-3 py-2 text-sm" />
              <input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="条件値 (任意)" className="border rounded px-3 py-2 text-sm" />
              <input type="number" value={nextStepOnFalse} onChange={(e) => setNextStepOnFalse(e.target.value)} placeholder="偽の場合の次step (任意)" className="border rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={createStep} className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">ステップ追加</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-gray-800">ステップ一覧</h2>
            {scenario.steps.length === 0 ? <p className="text-sm text-gray-500">まだステップがありません。</p> : null}
            {scenario.steps.map((step) => (
              <div key={step.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">STEP {step.step_order}</span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{step.message_type}</span>
                    <span className="text-xs text-gray-400">{step.delay_minutes} 分後</span>
                  </div>
                  <button onClick={() => deleteStep(step.id)} className="text-sm text-red-500 hover:text-red-700">削除</button>
                </div>
                <textarea
                  defaultValue={step.message_content}
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm"
                  onBlur={(e) => {
                    if (e.target.value !== step.message_content) {
                      updateStep(step, { messageContent: e.target.value });
                    }
                  }}
                />
                <div className="grid md:grid-cols-4 gap-3">
                  <input
                    type="number"
                    defaultValue={step.step_order}
                    className="border rounded px-3 py-2 text-sm"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value !== step.step_order) {
                        updateStep(step, { stepOrder: value });
                      }
                    }}
                  />
                  <input
                    type="number"
                    defaultValue={step.delay_minutes}
                    className="border rounded px-3 py-2 text-sm"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value !== step.delay_minutes) {
                        updateStep(step, { delayMinutes: value });
                      }
                    }}
                  />
                  <input
                    defaultValue={step.condition_type ?? ""}
                    placeholder="条件タイプ"
                    className="border rounded px-3 py-2 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== (step.condition_type ?? "")) {
                        updateStep(step, { conditionType: e.target.value });
                      }
                    }}
                  />
                  <input
                    defaultValue={step.condition_value ?? ""}
                    placeholder="条件値"
                    className="border rounded px-3 py-2 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== (step.condition_value ?? "")) {
                        updateStep(step, { conditionValue: e.target.value });
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">友だちへ手動 enroll</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <select value={friendId} onChange={(e) => setFriendId(e.target.value)} className="border rounded px-3 py-2 text-sm md:min-w-72">
                <option value="">友だちを選択</option>
                {friends.map((friend) => (
                  <option key={friend.id} value={friend.id}>
                    {friend.display_name}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!friendId) return;
                  await api.scenarios.enroll(scenario.id, Number(friendId));
                  alert("シナリオに enroll しました");
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

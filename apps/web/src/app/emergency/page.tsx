"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function EmergencyPage() {
  const [confirmed, setConfirmed] = useState("");
  const [message, setMessage] = useState("");

  const action = async (label: string, fn: () => Promise<void>) => {
    if (confirmed !== label) {
      setConfirmed(label);
      setMessage(`「${label}」を確認するにはもう一度クリックしてください`);
      return;
    }
    try {
      await fn();
      setMessage(`${label} を実行しました`);
    } catch (e) {
      setMessage(`エラー: ${e}`);
    }
    setConfirmed("");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-alert mb-2">緊急対応</h1>
      <p className="text-sm text-brand-gray mb-6">この操作は取り消せません。慎重に実行してください。</p>

      {message && (
        <div className={`rounded-[6px] p-3 mb-4 text-sm ${message.startsWith("エラー") ? "bg-brand-alert/8 text-brand-alert" : "bg-brand-gold/10 text-brand-black"}`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-[8px] shadow-sm p-4 border border-brand-alert/15">
          <h3 className="font-medium text-brand-alert">全配信停止</h3>
          <p className="text-sm text-brand-gray mb-3">スケジュール済みの配信をすべてドラフトに戻します</p>
          <button
            onClick={() => action("全配信停止", async () => {
              const broadcasts = await api.broadcasts.list();
              for (const b of (broadcasts.data as Array<{ id: number; status: string }>) ) {
                if (b.status === "scheduled") await api.broadcasts.update(b.id, { status: "draft" });
              }
            })}
            className={`px-4 py-2 rounded text-sm font-medium ${confirmed === "全配信停止" ? "bg-brand-alert/80 text-white" : "bg-brand-alert/8 text-brand-alert hover:bg-brand-alert/10"}`}
          >
            {confirmed === "全配信停止" ? "本当に実行する" : "全配信停止"}
          </button>
        </div>

        <div className="bg-white rounded-[8px] shadow-sm p-4 border border-brand-orange/15">
          <h3 className="font-medium text-brand-orange">全シナリオ停止</h3>
          <p className="text-sm text-brand-gray mb-3">アクティブなシナリオをすべて無効化します</p>
          <button
            onClick={() => action("全シナリオ停止", async () => {
              const scenarios = await api.scenarios.list();
              for (const s of (scenarios.data as Array<{ id: number; is_active: boolean }>) ) {
                if (s.is_active) await api.scenarios.update(s.id, { isActive: false });
              }
            })}
            className={`px-4 py-2 rounded text-sm font-medium ${confirmed === "全シナリオ停止" ? "bg-brand-orange/80 text-white" : "bg-brand-orange/8 text-brand-orange hover:bg-brand-orange/12"}`}
          >
            {confirmed === "全シナリオ停止" ? "本当に実行する" : "全シナリオ停止"}
          </button>
        </div>
      </div>
    </div>
  );
}

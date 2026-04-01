"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Webhook {
  id: number;
  name: string;
  url?: string;
  is_active: boolean;
}

export default function WebhooksPage() {
  const [tab, setTab] = useState<"incoming" | "outgoing">("outgoing");
  const [incoming, setIncoming] = useState<Webhook[]>([]);
  const [outgoing, setOutgoing] = useState<Webhook[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const load = async () => {
    const [inc, out] = await Promise.all([api.webhooks.incoming(), api.webhooks.outgoing()]);
    setIncoming(inc.data as Webhook[]);
    setOutgoing(out.data as Webhook[]);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name) return;
    if (tab === "outgoing" && url) {
      await api.webhooks.createOutgoing({ name, url });
    } else {
      await api.webhooks.createIncoming({ name });
    }
    setName("");
    setUrl("");
    load();
  };

  const items = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Webhook</h1>

      <div className="flex gap-2">
        {(["outgoing", "incoming"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === type ? "bg-green-500 text-white" : "bg-white text-gray-600 border"}`}
          >
            {type === "outgoing" ? "送信Webhook" : "受信Webhook"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="flex-1 border rounded px-3 py-2 text-sm" />
        {tab === "outgoing" ? (
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="flex-1 border rounded px-3 py-2 text-sm" />
        ) : null}
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">追加</button>
      </div>

      <div className="space-y-3">
        {items.map((webhook) => (
          <div key={webhook.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{webhook.name}</h3>
                {webhook.url ? <p className="text-xs text-gray-400">{webhook.url}</p> : null}
              </div>
              <div className="flex gap-2">
                {tab === "outgoing" ? (
                  <button
                    onClick={async () => {
                      await api.webhooks.updateOutgoing(webhook.id, { isActive: !webhook.is_active });
                      await load();
                    }}
                    className={`text-sm px-3 py-1 rounded ${webhook.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {webhook.is_active ? "有効" : "無効"}
                  </button>
                ) : null}
                <button
                  onClick={() => (tab === "incoming" ? api.webhooks.deleteIncoming(webhook.id) : api.webhooks.deleteOutgoing(webhook.id)).then(load)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
            {tab === "outgoing" && webhook.url ? (
              <input
                defaultValue={webhook.url}
                className="w-full border rounded px-3 py-2 text-sm"
                onBlur={async (e) => {
                  if (e.target.value !== webhook.url) {
                    await api.webhooks.updateOutgoing(webhook.id, { name: webhook.name, url: e.target.value, isActive: webhook.is_active });
                    await load();
                  }
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

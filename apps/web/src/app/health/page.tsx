"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Migration {
  id: number;
  from_account_id: number;
  to_account_id: number;
  status: string;
  total_friends: number | null;
  migrated_friends: number;
  created_at: string;
}

interface LineAccount {
  id: number;
  name: string;
  is_active: boolean;
}

interface HealthLog {
  id: number;
  account_id: number;
  risk_level: string;
  message_count: number | null;
  details: string | null;
  created_at: string;
}

export default function HealthPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const load = async () => {
    const [migrationResponse, accountResponse] = await Promise.all([
      api.health.migrations(),
      api.lineAccounts.list(),
    ]);
    const accountData = accountResponse.data as LineAccount[];
    setMigrations(migrationResponse.data as Migration[]);
    setAccounts(accountData);
    if (!selectedAccountId && accountData.length > 0) {
      setSelectedAccountId(String(accountData[0].id));
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    api.health.logs(Number(selectedAccountId)).then((response) => setHealthLogs(response.data as HealthLog[]));
  }, [selectedAccountId]);

  const createMigration = async () => {
    if (!fromId || !toId) return;
    await api.health.createMigration({ fromAccountId: Number(fromId), toAccountId: Number(toId) });
    setFromId("");
    setToId("");
    load();
  };

  const statusColor = (s: string) => ({ pending: "bg-brand-lightgray text-brand-black/60", running: "bg-brand-skyblue/15 text-brand-orange", completed: "bg-brand-orange/12 text-brand-orange", failed: "bg-brand-alert/10 text-brand-alert" }[s] ?? "");
  const riskColor = (s: string) => ({ normal: "bg-brand-orange/12 text-brand-orange", warning: "bg-brand-gold/15 text-brand-black", danger: "bg-brand-alert/10 text-brand-alert" }[s] ?? "bg-brand-lightgray text-brand-black/60");
  const selectedAccount = useMemo(() => accounts.find((account) => String(account.id) === selectedAccountId), [accounts, selectedAccountId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-black">アカウント健全性</h1>

      <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
        <h2 className="font-medium">アカウント移行</h2>
        <div className="grid md:grid-cols-[180px_auto_180px_auto] gap-3 items-center">
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">移行元アカウント</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <span className="text-brand-gray/70">→</span>
          <select value={toId} onChange={(e) => setToId(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">移行先アカウント</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <button onClick={createMigration} className="bg-brand-blue text-white px-4 py-2 rounded text-sm hover:bg-brand-blue">開始</button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">健全性ログ</h2>
          <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">アカウントを選択</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        {selectedAccount ? <p className="text-sm text-brand-gray">{selectedAccount.name} の直近100件</p> : null}
        <div className="space-y-3">
          {healthLogs.length === 0 ? <p className="text-sm text-brand-gray">健全性ログはまだありません。</p> : null}
          {healthLogs.map((log) => (
            <div key={log.id} className="rounded-[8px] border border-brand-lightgray/70 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`rounded px-2 py-1 text-xs ${riskColor(log.risk_level)}`}>{log.risk_level}</span>
                {log.message_count !== null ? <span className="rounded bg-brand-lightgray px-2 py-1 text-xs text-brand-black/60">message_count: {log.message_count}</span> : null}
                <span className="text-xs text-brand-gray/70">{new Date(log.created_at).toLocaleString("ja-JP")}</span>
              </div>
              {log.details ? <pre className="overflow-x-auto rounded bg-brand-highlight p-3 text-xs text-brand-black/80">{log.details}</pre> : <p className="text-sm text-brand-gray">詳細なし</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {migrations.map((m) => (
          <div key={m.id} className="bg-white rounded-[8px] shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm">アカウント {m.from_account_id} → {m.to_account_id}</p>
              {m.total_friends ? <p className="text-xs text-brand-gray/70">{m.migrated_friends}/{m.total_friends} 件</p> : null}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${statusColor(m.status)}`}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

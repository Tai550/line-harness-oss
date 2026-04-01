"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AffiliateReport {
  id: number;
  name: string;
  ref_code: string;
  report: { totalClicks: number; totalConversions: number; totalValue: number };
}

export default function AffiliatesPage() {
  const [reports, setReports] = useState<AffiliateReport[]>([]);
  const [name, setName] = useState("");
  const [refCode, setRefCode] = useState("");

  const load = () => api.affiliates.report().then((r) => setReports(r.data as AffiliateReport[]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !refCode) return;
    await api.affiliates.create({ name, refCode });
    setName(""); setRefCode(""); load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">アフィリエイト</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="flex-1 border rounded px-3 py-2 text-sm" />
        <input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="refコード" className="w-40 border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">追加</button>
      </div>

      <div className="space-y-3">
        {reports.map((a) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium">{a.name}</h3>
                <p className="text-xs text-gray-400">ref: {a.ref_code}</p>
              </div>
              <div className="flex gap-3">
                <a href={`/affiliates/detail?id=${a.id}`} className="text-sm text-blue-500 hover:underline">編集</a>
                <button onClick={() => api.affiliates.delete(a.id).then(load)} className="text-sm text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-gray-50 rounded p-2 text-center">
                <p className="text-xl font-bold text-gray-700">{a.report.totalClicks}</p>
                <p className="text-xs text-gray-400">クリック</p>
              </div>
              <div className="bg-gray-50 rounded p-2 text-center">
                <p className="text-xl font-bold text-gray-700">{a.report.totalConversions}</p>
                <p className="text-xs text-gray-400">CV数</p>
              </div>
              <div className="bg-gray-50 rounded p-2 text-center">
                <p className="text-xl font-bold text-gray-700">¥{a.report.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">売上</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

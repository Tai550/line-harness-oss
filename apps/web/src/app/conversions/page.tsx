"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ConversionPoint {
  id: number;
  name: string;
  point_value: number;
}

interface Report {
  name: string;
  count: number;
  total_value: number;
}

export default function ConversionsPage() {
  const [points, setPoints] = useState<ConversionPoint[]>([]);
  const [report, setReport] = useState<Report[]>([]);
  const [name, setName] = useState("");
  const [pointValue, setPointValue] = useState("0");

  const load = async () => {
    const [p, r] = await Promise.all([api.conversions.points(), api.conversions.report()]);
    setPoints(p.data as ConversionPoint[]);
    setReport(r.data as Report[]);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return;
    await api.conversions.createPoint({ name, pointValue: Number(pointValue) });
    setName(""); setPointValue("0"); load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-6">コンバージョン</h1>

      <div className="bg-white rounded-[8px] shadow-sm p-4 mb-6 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="コンバージョン名" className="flex-1 border rounded px-3 py-2 text-sm" />
        <input type="number" value={pointValue} onChange={(e) => setPointValue(e.target.value)} placeholder="ポイント値" className="w-28 border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange">追加</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.map((r, i) => (
          <div key={i} className="bg-white rounded-[8px] shadow-sm p-4">
            <h3 className="font-medium">{r.name}</h3>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-2xl font-bold text-brand-orange">{r.count}</p>
                <p className="text-xs text-brand-gray/70">件数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-orange">¥{r.total_value?.toLocaleString() ?? 0}</p>
                <p className="text-xs text-brand-gray/70">合計値</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

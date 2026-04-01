"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Affiliate {
  id: number;
  name: string;
  ref_code: string;
  commission_rate: number;
  is_active: boolean;
}

interface AffiliateReport {
  totalClicks: number;
  totalConversions: number;
  totalValue: number;
}

export default function AffiliateDetailPage() {
  const searchParams = useSearchParams();
  const affiliateId = Number(searchParams.get("id"));

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [report, setReport] = useState<AffiliateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [commissionRate, setCommissionRate] = useState("0");

  const load = async () => {
    if (!Number.isFinite(affiliateId)) {
      setError("アフィリエイトIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [affiliatesResponse, reportResponse] = await Promise.all([
        api.affiliates.list(),
        api.affiliates.get(affiliateId),
      ]);
      const target = (affiliatesResponse.data as Affiliate[]).find((item) => item.id === affiliateId) ?? null;
      setAffiliate(target);
      setReport(reportResponse.data as AffiliateReport);
      setName(target?.name ?? "");
      setCommissionRate(String(target?.commission_rate ?? 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [affiliateId]);

  if (!Number.isFinite(affiliateId)) {
    return <div className="text-sm text-red-500">アフィリエイトIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">アフィリエイト詳細</h1>
          <p className="text-sm text-gray-500">報酬率の更新と成果確認を行います。</p>
        </div>
        <Link href="/affiliates" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {affiliate ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="w-full border rounded px-3 py-2 text-sm" />
            <input value={affiliate.ref_code} readOnly className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500" />
            <div className="grid md:grid-cols-2 gap-3">
              <input type="number" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} placeholder="報酬率" className="border rounded px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  await api.affiliates.update(affiliate.id, { isActive: !affiliate.is_active });
                  await load();
                }}
                className={`px-4 py-2 rounded text-sm ${affiliate.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {affiliate.is_active ? "有効" : "無効"}
              </button>
            </div>
            <button
              onClick={async () => {
                await api.affiliates.update(affiliate.id, { name, commissionRate: Number(commissionRate) });
                await load();
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
            >
              保存
            </button>
          </div>

          {report ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{report.totalClicks}</p>
                <p className="text-xs text-gray-400">クリック</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{report.totalConversions}</p>
                <p className="text-xs text-gray-400">CV数</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">¥{report.totalValue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">売上</p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

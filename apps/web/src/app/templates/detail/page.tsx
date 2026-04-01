"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Template {
  id: number;
  name: string;
  category: string | null;
  message_type: string;
  content: string;
}

export default function TemplateDetailPage() {
  const searchParams = useSearchParams();
  const templateId = Number(searchParams.get("id"));

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    if (!Number.isFinite(templateId)) {
      setError("テンプレートIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.templates.get(templateId);
      const data = response.data as Template;
      setTemplate(data);
      setName(data.name);
      setCategory(data.category ?? "");
      setContent(data.content);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [templateId]);

  if (!Number.isFinite(templateId)) {
    return <div className="text-sm text-red-500">テンプレートIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">テンプレート詳細</h1>
          <p className="text-sm text-gray-500">メッセージテンプレートの編集を行います。</p>
        </div>
        <Link href="/templates" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {template ? (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="テンプレート名" className="w-full border rounded px-3 py-2 text-sm" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="カテゴリ" className="w-full border rounded px-3 py-2 text-sm" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="内容" className="w-full border rounded px-3 py-2 text-sm" />
          <button
            onClick={async () => {
              await api.templates.update(template.id, { name, category, content });
              await load();
            }}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
          >
            保存
          </button>
        </div>
      ) : null}
    </div>
  );
}

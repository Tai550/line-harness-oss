"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Template {
  id: number;
  name: string;
  category: string | null;
  message_type: string;
  content: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");

  const load = () => api.templates.list().then((r) => setTemplates(r.data as Template[]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !content) return;
    await api.templates.create({ name, category: category || undefined, content });
    setName(""); setCategory(""); setContent(""); load();
  };

  const del = async (id: number) => {
    if (confirm("削除しますか？")) { await api.templates.delete(id); load(); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-6">テンプレート</h1>

      <div className="bg-white rounded-[8px] shadow-sm p-4 mb-6 space-y-3">
        <div className="flex gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="テンプレート名" className="flex-1 border rounded px-3 py-2 text-sm" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="カテゴリ" className="w-32 border rounded px-3 py-2 text-sm" />
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容" rows={3} className="w-full border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange">保存</button>
      </div>

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-white rounded-[8px] shadow-sm p-4 flex justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{t.name}</h3>
                {t.category && <span className="text-xs bg-brand-gold/10 text-brand-black/70 px-2 py-0.5 rounded">{t.category}</span>}
              </div>
              <p className="text-sm text-brand-gray mt-1 line-clamp-2">{t.content}</p>
            </div>
            <div className="ml-4 shrink-0 flex gap-3">
              <a href={`/templates/detail?id=${t.id}`} className="text-sm text-brand-blue hover:underline">編集</a>
              <button onClick={() => del(t.id)} className="text-sm text-brand-alert/60 hover:text-brand-alert">削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

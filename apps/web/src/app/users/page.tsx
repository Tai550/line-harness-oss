"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  id: number;
  email: string | null;
  name: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const load = () => api.users.list().then((r) => setUsers(r.data as User[]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!email && !name) return;
    await api.users.create({ email: email || undefined, name: name || undefined });
    setEmail(""); setName(""); load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-6">ユーザー管理</h1>

      <div className="bg-white rounded-[8px] shadow-sm p-4 mb-6 flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="flex-1 border rounded px-3 py-2 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メール" className="flex-1 border rounded px-3 py-2 text-sm" />
        <button onClick={create} className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange">作成</button>
      </div>

      <div className="bg-white rounded-[8px] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-highlight text-brand-gray text-xs">
            <tr>
              <th className="text-left px-4 py-3">名前</th>
              <th className="text-left px-4 py-3">メール</th>
              <th className="text-left px-4 py-3">登録日</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-lightgray">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-brand-highlight">
                <td className="px-4 py-3">{u.name ?? "-"}</td>
                <td className="px-4 py-3 text-brand-gray">{u.email ?? "-"}</td>
                <td className="px-4 py-3 text-brand-gray/70">{new Date(u.created_at).toLocaleDateString("ja-JP")}</td>
                <td className="px-4 py-3 text-right">
                  <a href={`/users/detail?id=${u.id}`} className="mr-3 text-brand-blue hover:text-brand-blue text-xs">詳細</a>
                  <button onClick={() => api.users.delete(u.id).then(load)} className="text-brand-alert/60 hover:text-brand-alert text-xs">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

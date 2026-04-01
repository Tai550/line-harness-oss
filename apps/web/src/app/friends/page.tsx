"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Friend {
  id: number;
  display_name: string;
  picture_url: string | null;
  is_following: boolean;
  score: number;
  account_id: number | null;
  created_at: string;
  tags?: Array<{ id: number; name: string; color: string }>;
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface LineAccount {
  id: number;
  name: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [offset, setOffset] = useState(0);
  const [tagFilter, setTagFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const loadFriends = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (tagFilter) params.set("tagId", tagFilter);
    if (accountFilter) params.set("accountId", accountFilter);
    const res = await api.friends.list(params.toString());
    setFriends(res.data as Friend[]);
    setTotal(res.total);
    setLoading(false);
  };

  useEffect(() => {
    api.tags.list().then((r) => setTags(r.data as Tag[]));
    api.lineAccounts.list().then((r) => setAccounts(r.data as LineAccount[]));
  }, []);

  useEffect(() => {
    loadFriends();
  }, [offset, tagFilter, accountFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">友だち管理</h1>
        <span className="text-sm text-gray-500">合計 {total.toLocaleString()} 人</span>
      </div>

      <div className="mb-4 flex gap-2">
        <select
          value={accountFilter}
          onChange={(e) => { setAccountFilter(e.target.value); setOffset(0); }}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">すべてのアカウント</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setOffset(0); }}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">すべてのタグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">名前</th>
                <th className="text-left px-4 py-3">ステータス</th>
                <th className="text-left px-4 py-3">スコア</th>
                <th className="text-left px-4 py-3">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {friends.map((friend) => (
                <tr key={friend.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {friend.picture_url ? (
                        <img src={friend.picture_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {friend.display_name[0]}
                        </div>
                      )}
                      <span className="font-medium">{friend.display_name}</span>
                    </div>
                    <a href={`/friends/detail?id=${friend.id}`} className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-700">
                      詳細を見る
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${friend.is_following ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {friend.is_following ? "フォロー中" : "ブロック"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{friend.score}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(friend.created_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">前へ</button>
        <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="px-3 py-1.5 border rounded text-sm disabled:opacity-40">次へ</button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface UserDetail {
  id: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  metadata: string;
  created_at: string;
}

interface Friend {
  id: number;
  display_name: string;
}

export default function UserDetailPage() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));

  const [user, setUser] = useState<UserDetail | null>(null);
  const [linkedFriends, setLinkedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [metadata, setMetadata] = useState("{}");
  const [selectedFriendId, setSelectedFriendId] = useState("");

  const load = async () => {
    if (!Number.isFinite(userId)) {
      setError("ユーザーIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [userResponse, linkedResponse, friendsResponse] = await Promise.all([
        api.users.get(userId),
        api.users.accounts(userId),
        api.friends.list("limit=100&offset=0"),
      ]);
      const data = userResponse.data as UserDetail;
      setUser(data);
      setLinkedFriends(linkedResponse.data as Friend[]);
      setFriends(friendsResponse.data as Friend[]);
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setMetadata(data.metadata || "{}");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  if (!Number.isFinite(userId)) {
    return <div className="text-sm text-red-500">ユーザーIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ユーザー詳細</h1>
          <p className="text-sm text-gray-500">顧客情報の更新と LINE友だちの紐付けを行います。</p>
        </div>
        <Link href="/users" className="text-sm text-blue-600 hover:text-blue-700">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-gray-400">読み込み中...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {user ? (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名前" className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid md:grid-cols-2 gap-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メール" className="border rounded px-3 py-2 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="電話番号" className="border rounded px-3 py-2 text-sm" />
            </div>
            <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={5} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            <button
              onClick={async () => {
                await api.users.update(user.id, { name, email, phone, metadata });
                await load();
              }}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
            >
              保存
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">紐付け済み LINE友だち</h2>
            <div className="flex flex-wrap gap-2">
              {linkedFriends.length === 0 ? <p className="text-sm text-gray-500">まだ紐付けがありません。</p> : null}
              {linkedFriends.map((friend) => (
                <span key={friend.id} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  {friend.display_name}
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <select value={selectedFriendId} onChange={(e) => setSelectedFriendId(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="">友だちを選択</option>
                {friends
                  .filter((friend) => !linkedFriends.some((linked) => linked.id === friend.id))
                  .map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.display_name}
                    </option>
                  ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedFriendId) return;
                  await api.users.linkFriend(user.id, Number(selectedFriendId));
                  setSelectedFriendId("");
                  await load();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
              >
                紐付け
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

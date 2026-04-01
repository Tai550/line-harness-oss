"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface FriendDetail {
  id: number;
  display_name: string;
  picture_url: string | null;
  status_message: string | null;
  is_following: boolean;
  line_user_id: string;
  score: number;
  metadata: string;
  created_at: string;
  tags: Tag[];
}

export default function FriendDetailPage() {
  const searchParams = useSearchParams();
  const friendId = Number(searchParams.get("id"));

  const [friend, setFriend] = useState<FriendDetail | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metadataText, setMetadataText] = useState("{}");
  const [messageType, setMessageType] = useState("text");
  const [messageContent, setMessageContent] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");

  const load = async () => {
    if (!Number.isFinite(friendId)) {
      setError("友だちIDが不正です");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [friendResponse, tagsResponse] = await Promise.all([
        api.friends.get(friendId),
        api.tags.list(),
      ]);
      const data = friendResponse.data as FriendDetail;
      setFriend(data);
      setMetadataText(data.metadata || "{}");
      setAllTags(tagsResponse.data as Tag[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [friendId]);

  if (!Number.isFinite(friendId)) {
    return <div className="text-sm text-brand-alert">友だちIDが不正です。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">友だち詳細</h1>
          <p className="text-sm text-brand-gray">タグ、メタデータ、個別メッセージ送信を管理します。</p>
        </div>
        <Link href="/friends" className="text-sm text-brand-orange hover:text-brand-blue">
          一覧へ戻る
        </Link>
      </div>

      {loading ? <p className="text-brand-gray/70">読み込み中...</p> : null}
      {error ? <p className="rounded-[6px] bg-brand-alert/8 px-4 py-3 text-sm text-brand-alert">{error}</p> : null}

      {friend ? (
        <>
          <div className="bg-white rounded-[8px] shadow-sm p-4">
            <div className="flex items-start gap-4">
              {friend.picture_url ? (
                <img src={friend.picture_url} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-lightgray flex items-center justify-center text-xl">
                  {friend.display_name[0]}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-brand-black">{friend.display_name}</h2>
                  <span className={`px-2 py-1 rounded text-xs ${friend.is_following ? "bg-brand-orange/8 text-brand-orange" : "bg-brand-lightgray text-brand-black/60"}`}>
                    {friend.is_following ? "フォロー中" : "ブロック"}
                  </span>
                </div>
                <p className="text-sm text-brand-gray">LINE User ID: {friend.line_user_id}</p>
                <p className="text-sm text-brand-gray">スコア: {friend.score}</p>
                {friend.status_message ? <p className="text-sm text-brand-gray">ステータスメッセージ: {friend.status_message}</p> : null}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-brand-black">タグ管理</h2>
            <div className="flex flex-wrap gap-2">
              {friend.tags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>
                  {tag.name}
                  <button
                    onClick={async () => {
                      await api.friends.removeTag(friend.id, tag.id);
                      await load();
                    }}
                    className="text-xs opacity-80 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <select value={selectedTagId} onChange={(e) => setSelectedTagId(e.target.value)} className="border rounded px-3 py-2 text-sm">
                <option value="">追加するタグを選択</option>
                {allTags
                  .filter((tag) => !friend.tags.some((assigned) => assigned.id === tag.id))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedTagId) return;
                  await api.friends.addTag(friend.id, Number(selectedTagId));
                  setSelectedTagId("");
                  await load();
                }}
                className="bg-brand-blue text-white px-4 py-2 rounded text-sm hover:bg-brand-blue"
              >
                タグ追加
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-brand-black">メタデータ</h2>
            <textarea value={metadataText} onChange={(e) => setMetadataText(e.target.value)} rows={8} className="w-full border rounded px-3 py-2 text-sm font-mono" />
            <button
              onClick={async () => {
                const parsed = JSON.parse(metadataText);
                await api.friends.setMetadata(friend.id, parsed);
                await load();
              }}
              className="bg-brand-orange text-white px-4 py-2 rounded text-sm hover:bg-brand-orange"
            >
              メタデータ保存
            </button>
          </div>

          <div className="bg-white rounded-[8px] shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-brand-black">個別メッセージ送信</h2>
            <select value={messageType} onChange={(e) => setMessageType(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="text">text</option>
              <option value="image">image</option>
              <option value="flex">flex</option>
            </select>
            <textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} rows={5} placeholder={messageType === "text" ? "送信テキスト" : messageType === "image" ? "画像URL" : "Flex JSON"} className="w-full border rounded px-3 py-2 text-sm" />
            <button
              onClick={async () => {
                if (!messageContent.trim()) return;
                await api.friends.sendMessage(friend.id, messageType, messageContent);
                setMessageContent("");
                alert("送信しました");
              }}
              className="bg-brand-black/80 text-white px-4 py-2 rounded text-sm hover:bg-brand-black"
            >
              送信
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

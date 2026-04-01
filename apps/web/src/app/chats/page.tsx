"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Chat {
  id: number;
  friend_id: number;
  friend_name: string;
  picture_url: string | null;
  status: string;
  last_message_at: string | null;
}

interface Message {
  id: number;
  direction: string;
  message_type: string;
  content: string;
  created_at: string;
}

interface ChatDetail {
  id: number;
  friend_name: string;
  line_user_id: string;
  status: string;
  messages: Message[];
}

interface Operator {
  id: number;
  name: string;
  email: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [text, setText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    const response = await api.chats.list(statusFilter || undefined);
    setChats(response.data as Chat[]);
  };

  const loadOperators = async () => {
    const response = await api.operators.list();
    setOperators(response.data as Operator[]);
  };

  const loadChat = (id: number) => api.chats.get(id).then((r) => setSelectedChat(r.data as ChatDetail));

  useEffect(() => {
    loadChats();
  }, [statusFilter]);

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  const send = async () => {
    if (!text.trim() || !selectedChat) return;
    await api.chats.send(selectedChat.id, text);
    setText("");
    await loadChat(selectedChat.id);
    await loadChats();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">チャット</h1>
            <p className="text-sm text-gray-500">有人対応、解決ステータス管理、オペレーター管理を行います。</p>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">すべて</option>
            <option value="unread">unread</option>
            <option value="active">active</option>
            <option value="resolved">resolved</option>
          </select>
        </div>

        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="オペレーター名" className="border rounded px-3 py-2 text-sm" />
          <input value={operatorEmail} onChange={(e) => setOperatorEmail(e.target.value)} placeholder="メール" className="border rounded px-3 py-2 text-sm" />
          <button
            onClick={async () => {
              if (!operatorName || !operatorEmail) return;
              await api.operators.create({ name: operatorName, email: operatorEmail });
              setOperatorName("");
              setOperatorEmail("");
              await loadOperators();
            }}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
          >
            追加
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {operators.map((operator) => (
            <span key={operator.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {operator.name}
              <button
                onClick={async () => {
                  await api.operators.delete(operator.id);
                  await loadOperators();
                }}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-[calc(100vh-14rem)] gap-4">
        <div className="w-72 bg-white rounded-xl shadow-sm overflow-y-auto">
          <div className="p-3 border-b">
            <h2 className="font-medium text-sm">チャット一覧</h2>
          </div>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                loadChat(chat.id);
                loadChats();
              }}
              className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b text-left ${selectedChat?.id === chat.id ? "bg-green-50" : ""}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm shrink-0">
                {chat.friend_name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{chat.friend_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${chat.status === "unread" ? "bg-red-100 text-red-600" : chat.status === "resolved" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>{chat.status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{selectedChat.friend_name}</h2>
                <div className="flex gap-2">
                  {["unread", "active", "resolved"].map((status) => (
                    <button
                      key={status}
                      onClick={() => api.chats.updateStatus(selectedChat.id, status).then(async () => { await loadChat(selectedChat.id); await loadChats(); })}
                      className={`text-sm px-3 py-1 rounded ${selectedChat.status === status ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {[...selectedChat.messages].reverse().map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${msg.direction === "outbound" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-800"}`}>
                      <p>{msg.content}</p>
                      <p className={`mt-1 text-[10px] ${msg.direction === "outbound" ? "text-green-50" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="メッセージを入力..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={send} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">送信</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">チャットを選択してください</div>
          )}
        </div>
      </div>
    </div>
  );
}

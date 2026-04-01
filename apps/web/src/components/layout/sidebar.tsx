"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { section: "メイン", items: [
    { href: "/", label: "ダッシュボード", icon: "🏠" },
    { href: "/friends", label: "友だち管理", icon: "👥" },
    { href: "/chats", label: "チャット", icon: "💬" },
  ]},
  { section: "配信", items: [
    { href: "/broadcasts", label: "一斉配信", icon: "📢" },
    { href: "/scenarios", label: "ステップ配信", icon: "🔄" },
    { href: "/reminders", label: "リマインダー", icon: "⏰" },
    { href: "/templates", label: "テンプレート", icon: "📝" },
  ]},
  { section: "分析", items: [
    { href: "/analytics", label: "メッセージ分析", icon: "📊" },
    { href: "/conversions", label: "コンバージョン", icon: "💰" },
    { href: "/affiliates", label: "アフィリエイト", icon: "🔗" },
    { href: "/scoring", label: "スコアリング", icon: "⭐" },
  ]},
  { section: "自動化", items: [
    { href: "/automations", label: "オートメーション", icon: "⚙️" },
    { href: "/notifications", label: "通知", icon: "🔔" },
    { href: "/webhooks", label: "Webhook", icon: "🌐" },
  ]},
  { section: "設定", items: [
    { href: "/accounts", label: "LINEアカウント", icon: "🔑" },
    { href: "/users", label: "ユーザー管理", icon: "👤" },
    { href: "/health", label: "アカウント健全性", icon: "🩺" },
    { href: "/emergency", label: "緊急対応", icon: "🚨" },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("lh_api_key");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white rounded p-2 shadow"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 w-60 h-screen bg-white border-r flex flex-col transition-transform`}>
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-green-600">LINE Harness</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((section) => (
            <div key={section.section} className="mb-4">
              <p className="text-xs text-gray-400 px-2 mb-1 uppercase tracking-wide">{section.section}</p>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                      active
                        ? "bg-green-50 text-green-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 hover:text-red-500 py-1"
          >
            ログアウト
          </button>
          <p className="text-xs text-gray-400 text-center mt-1">LINE Harness v0.1</p>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { section: "MAIN", items: [
    { href: "/", label: "ダッシュボード", icon: "🏠" },
    { href: "/friends", label: "友だち管理", icon: "👥" },
    { href: "/chats", label: "チャット", icon: "💬" },
  ]},
  { section: "DELIVERY", items: [
    { href: "/broadcasts", label: "一斉配信", icon: "📢" },
    { href: "/scenarios", label: "ステップ配信", icon: "🔄" },
    { href: "/reminders", label: "リマインダー", icon: "⏰" },
    { href: "/templates", label: "テンプレート", icon: "📝" },
  ]},
  { section: "ANALYTICS", items: [
    { href: "/analytics", label: "メッセージ分析", icon: "📊" },
    { href: "/conversions", label: "コンバージョン", icon: "💰" },
    { href: "/affiliates", label: "アフィリエイト", icon: "🔗" },
    { href: "/scoring", label: "スコアリング", icon: "⭐" },
  ]},
  { section: "AUTOMATION", items: [
    { href: "/automations", label: "オートメーション", icon: "⚙️" },
    { href: "/notifications", label: "通知", icon: "🔔" },
    { href: "/webhooks", label: "Webhook", icon: "🌐" },
  ]},
  { section: "SETTINGS", items: [
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
        className="fixed top-4 left-4 z-50 md:hidden bg-brand-black text-white rounded-[6px] p-2 shadow-lg"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 w-60 h-screen bg-brand-black flex flex-col transition-transform`}>
        {/* Logo area with orange accent top border */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 rounded-sm bg-brand-orange" />
            <h1 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-en), var(--font-ja)" }}>
              LINE Harness
            </h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((section) => (
            <div key={section.section} className="mb-5">
              <p className="section-label px-2 mb-2 text-white/40">{section.section}</p>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-sm transition-colors ${
                      active
                        ? "bg-brand-orange text-white font-semibold"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-white/50 hover:text-brand-alert py-1 transition-colors"
          >
            ログアウト
          </button>
          <p className="text-[10px] text-white/30 text-center mt-2" style={{ fontFamily: "var(--font-en)" }}>
            LINE Harness v0.1
          </p>
        </div>
      </aside>
    </>
  );
}

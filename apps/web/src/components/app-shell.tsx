"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./auth-guard";
import { Sidebar } from "./layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }
  return (
    <AuthGuard>
      <div className="flex h-screen bg-brand-highlight">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}

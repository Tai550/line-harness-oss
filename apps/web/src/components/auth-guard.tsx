"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem("lh_api_key");
    if (!key) {
      router.push("/login");
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  if (!authenticated) return null;
  return <>{children}</>;
}

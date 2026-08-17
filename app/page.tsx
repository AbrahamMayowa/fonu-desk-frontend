"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <span className="text-sm font-semibold text-slate-500">Loading Fonu Desk...</span>
      </div>
    </div>
  );
}

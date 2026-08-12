"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FLASH_MESSAGES: Record<string, string> = {
  created: "流水已成功入账",
  updated: "流水已更新",
  deleted: "流水已删除",
};

export function FlashToast({ flash }: { flash?: string }) {
  const router = useRouter();
  const cleanedRef = useRef(false);
  const [message, setMessage] = useState<string | null>(() =>
    flash && FLASH_MESSAGES[flash] ? FLASH_MESSAGES[flash] : null,
  );

  useEffect(() => {
    if (!flash || cleanedRef.current) {
      return;
    }

    cleanedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    params.delete("flash");
    const query = params.toString();
    router.replace(query ? `/records?${query}` : "/records", { scroll: false });
  }, [flash, router]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-50 flex max-w-sm items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg"
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
        ✓
      </span>
      <span>{message}</span>
    </div>
  );
}

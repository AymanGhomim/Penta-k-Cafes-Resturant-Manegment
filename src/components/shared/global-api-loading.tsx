"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function GlobalApiLoading() {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const onLoading = (event: Event) => {
      setLoading(Boolean((event as CustomEvent<{ loading?: boolean }>).detail?.loading));
    };
    window.addEventListener("api-loading", onLoading);
    return () => window.removeEventListener("api-loading", onLoading);
  }, []);
  if (!loading) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/20" role="status" aria-label="جاري تنفيذ الطلب">
      <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      <span className="sr-only"><Loader2 className="animate-spin" /> جاري تنفيذ الطلب...</span>
    </div>
  );
}

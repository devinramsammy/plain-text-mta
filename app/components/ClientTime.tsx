"use client";

import { useEffect, useState } from "react";

export default function ClientTime({
  iso,
  options,
}: {
  iso: string; // ISO timestamp from server
  options?: Intl.DateTimeFormatOptions;
}) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    try {
      const date = new Date(iso);
      const formatted = date.toLocaleTimeString(undefined, {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        ...options,
      });
      setText(formatted);
    } catch {
      setText(iso);
    }
  }, [iso, options]);

  return <span>{text}</span>;
}

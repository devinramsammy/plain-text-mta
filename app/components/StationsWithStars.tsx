"use client";

import { useEffect, useMemo, useState } from "react";

export type StationItem = { name: string; key: string };

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem("ptmta:favorites");
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch (err) {
    console.error(err);
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  try {
    localStorage.setItem("ptmta:favorites", JSON.stringify(Array.from(favs)));
  } catch (err) {
    console.error(err);
  }
}

export default function StationsWithStars({ items }: { items: StationItem[] }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setFavorites(loadFavorites());
      setHydrated(true);
    };

    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "ptmta:favorites") refresh();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow as EventListener);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow as EventListener);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const toggle = (k: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      saveFavorites(next);
      return next;
    });
  };

  const rows = useMemo(
    () =>
      items.map((s) => {
        const on = favorites.has(s.key);
        const star = on ? "★" : "☆";
        return (
          <p key={s.key}>
            <button
              aria-label={on ? "Remove favorite" : "Add favorite"}
              onClick={() => toggle(s.key)}
              style={{
                fontSize: "14px",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: 0,
                marginRight: 8,
                color: "#8f8fff",
              }}
              disabled={!hydrated}
            >
              {star}
            </button>
            <a href={`/station/${encodeURIComponent(s.key)}`}>{s.name}</a>
          </p>
        );
      }),
    [items, favorites, hydrated]
  );

  return <>{rows}</>;
}

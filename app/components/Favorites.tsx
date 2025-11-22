"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { lookupStationsByNameKey } from "@/lib/stations";

type Fav = { key: string; name: string };

function loadFavoriteKeys(): string[] {
  try {
    const raw = localStorage.getItem("ptmta:favorites");
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return [];
    return Array.from(new Set(arr));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default function Favorites() {
  const [keys, setKeys] = useState<string[]>([]);

  useLayoutEffect(() => {
    const refresh = () => setKeys(loadFavoriteKeys());
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

  const items: Fav[] = useMemo(() => {
    return keys
      .map((k) => {
        const stations = lookupStationsByNameKey(k);
        const name = stations[0]?.stopName || k.replace(/_/g, " ");
        return { key: k, name } as Fav;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [keys]);

  const unfavorite = (key: string) => {
    try {
      const next = keys.filter((k) => k !== key);
      localStorage.setItem("ptmta:favorites", JSON.stringify(next));
      setKeys(next);
    } catch (err) {
      console.error(err);
    }
  };

  if (items.length === 0) return null;

  return (
    <section>
      <strong>
        <p>Starred</p>
      </strong>
      {items.map((f) => (
        <p key={f.key}>
          <button
            type="button"
            aria-label={`Unfavorite ${f.name}`}
            title="Unfavorite"
            onClick={() => unfavorite(f.key)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              marginRight: "6px",
              lineHeight: 1,
              color: "#8f8fff",
            }}
          >
            ★
          </button>
          <a href={`/station/${encodeURIComponent(f.key)}`}>{f.name}</a>
        </p>
      ))}
      {/* Putting footer here so it doesn't flash */}
    </section>
  );
}

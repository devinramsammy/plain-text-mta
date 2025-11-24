"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getArrivalsForStops,
  groupArrivalsTwoColumns,
  type ArrivalGroup,
} from "@/lib/mta";
import HeaderWithBack from "@/app/components/HeaderWithBack";
import ClientTime from "@/app/components/ClientTime";

type BaseMeta = Record<string, { name: string; routes: string[] } | undefined>;

export default function ArrivalsClient({
  stopIds,
  baseMeta,
  initialGroups,
}: {
  stopIds: string[];
  baseMeta: BaseMeta;
  initialGroups?: ArrivalGroup[];
}) {
  const [groups, setGroups] = useState<ArrivalGroup[]>(initialGroups ?? []);
  const [loadedAtIso, setLoadedAtIso] = useState<string>(
    new Date().toISOString()
  );
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState<string | undefined>(undefined);

  useEffect(() => {
    const referrer = document.referrer;

    const linePageMatch = referrer.match(/\/line\/([^\/\?\#]+)/);
    if (linePageMatch) {
      const lineName = decodeURIComponent(linePageMatch[1]);
      setBackHref(`/line/${encodeURIComponent(lineName)}`);
      return;
    }

    const allRoutes = new Set<string>();
    for (const meta of Object.values(baseMeta)) {
      if (meta?.routes) {
        for (const route of meta.routes) {
          allRoutes.add(route);
        }
      }
    }
    const sortedRoutes = Array.from(allRoutes).sort();
    if (sortedRoutes.length > 0) {
      setBackHref(`/line/${encodeURIComponent(sortedRoutes[0])}`);
    }
  }, [baseMeta]);

  useEffect(() => {
    let cancelled = false;

    const fetchArrivals = async () => {
      try {
        const data = await getArrivalsForStops(stopIds, { maxPerStop: 10 });
        if (cancelled) return;
        setGroups(groupArrivalsTwoColumns(data));
        setLoadedAtIso(new Date().toISOString());
        setError(null);
      } catch (err: unknown) {
        console.log("error", err);
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "unknown error";
        setError(String(message));
      }
    };

    // initial fetch
    fetchArrivals();
    // poll every 5 seconds
    const id = setInterval(fetchArrivals, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stopIds]);

  const anyArrivals = useMemo(
    () => groups.some((g) => g.north.length !== 0 || g.south.length !== 0),
    [groups]
  );

  return (
    <>
      <HeaderWithBack
        backHref={backHref}
        title={
          <span>
            Data updated: <ClientTime iso={loadedAtIso} />
          </span>
        }
      />
      {error && (
        <p style={{ color: "#cc3333" }}>Error loading arrivals: {error}</p>
      )}
      {!anyArrivals && <p>No upcoming arrivals or departures.</p>}
      {groups.map((g) => {
        const meta = baseMeta[g.base];
        const present = Array.from(
          new Set([
            ...g.north.map((c) => c.route),
            ...g.south.map((c) => c.route),
          ])
        ).sort();
        const routesText =
          present.length > 0 ? present.join(" ") : meta?.routes.join(" ") || "";
        const title = meta
          ? `${meta.name} — ${routesText}`
          : `${g.base} — ${routesText}`;
        return (
          <section key={g.base}>
            {(g.north.length !== 0 || g.south.length !== 0) && (
              <>
                <p>{title}</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                    textAlign: "left",
                    paddingBottom: "24px",
                    paddingLeft: "5px",
                  }}
                >
                  <div>
                    {g.north.length !== 0 && <p>uptown</p>}
                    {g.north.length !== 0 &&
                      g.north.slice(0, 3).map((c, i) => (
                        <p key={i}>
                          <span style={{ display: "inline-block", width: 24 }}>
                            {c.route}
                          </span>{" "}
                          {c.when}
                        </p>
                      ))}
                  </div>
                  <div>
                    {g.south.length !== 0 && <p>downtown</p>}
                    {g.south.length !== 0 &&
                      g.south.slice(0, 3).map((c, i) => (
                        <p key={i}>
                          <span style={{ display: "inline-block", width: 24 }}>
                            {c.route}
                          </span>{" "}
                          {c.when}
                        </p>
                      ))}
                  </div>
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

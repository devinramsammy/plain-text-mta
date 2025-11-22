import { lookupStationsByNameKey } from "@/lib/stations";
import ArrivalsClient from "@/app/components/ArrivalsClient";
import {
  getArrivalsForStops,
  groupArrivalsTwoColumns,
  type ArrivalGroup,
} from "@/lib/mta";

function expandWithDirections(ids: string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    const last = id.at(-1);
    if (last === "N" || last === "S") {
      out.add(id);
    } else {
      out.add(`${id}N`);
      out.add(`${id}S`);
    }
  }
  return Array.from(out);
}

function baseOf(id: string): string {
  const last = id.at(-1);
  if (last === "N" || last === "S") return id.slice(0, -1);
  return id;
}

export default async function StationPage({
  params,
}: {
  params: Promise<{ nameKey: string }>;
}) {
  const { nameKey } = await params;
  const decodedNameKey = decodeURIComponent(nameKey);
  const stations = lookupStationsByNameKey(decodedNameKey);

  if (!stations || stations.length === 0) {
    return <main>Unknown station: {decodedNameKey}</main>;
  }

  // Map GTFS base id -> display name and routes
  const baseMeta = new Map<string, { name: string; routes: string[] }>();
  for (const s of stations) {
    const routeSet = new Set<string>(s.routes);
    for (const id of s.gtfsStopIds) {
      const base = baseOf(id);
      const existing = baseMeta.get(base);
      if (existing) {
        for (const r of routeSet) existing.routes.push(r);
        existing.routes = Array.from(new Set(existing.routes)).sort();
      } else {
        baseMeta.set(base, {
          name: s.stopName,
          routes: Array.from(routeSet).sort(),
        });
      }
    }
  }

  const baseIds = Array.from(new Set(stations.flatMap((s) => s.gtfsStopIds)));
  const stopIds = expandWithDirections(baseIds);

  // Server-side prefetch arrivals to avoid loading flash
  let initialGroups: ArrivalGroup[] = [];
  try {
    const data = await getArrivalsForStops(stopIds, { maxPerStop: 10 });
    initialGroups = groupArrivalsTwoColumns(data);
  } catch {
    initialGroups = [];
  }

  const baseMetaObject = Object.fromEntries(baseMeta.entries());

  return (
    <main>
      <ArrivalsClient
        stopIds={stopIds}
        baseMeta={baseMetaObject}
        initialGroups={initialGroups}
      />
    </main>
  );
}

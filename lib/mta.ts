import { transit_realtime as gtfs } from "gtfs-realtime-bindings";
import { routesForStopId } from "@/lib/stations";

export type Arrival = {
  routeId: string;
  stopId: string;
  arrivalEpochSec: number;
  tripId?: string;
};

const MTA_BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds";

// Subway feeds. We fetch broadly to avoid requiring callers to know feed routing.
const SUBWAY_FEED_URLS: string[] = [
  `${MTA_BASE}/nyct%2Fgtfs`, // 1 2 3 4 5 6 and shuttles
  `${MTA_BASE}/nyct%2Fgtfs-7`, // 7
  `${MTA_BASE}/nyct%2Fgtfs-ace`, // A C E
  `${MTA_BASE}/nyct%2Fgtfs-bdfm`, // B D F M
  `${MTA_BASE}/nyct%2Fgtfs-g`, // G
  `${MTA_BASE}/nyct%2Fgtfs-jz`, // J Z
  `${MTA_BASE}/nyct%2Fgtfs-l`, // L
  `${MTA_BASE}/nyct%2Fgtfs-nqrw`, // N Q R W
  `${MTA_BASE}/nyct%2Fgtfs-si`, // Staten Island Railway
];

// Map each route to its corresponding GTFS feed URL to enable minimal fetching.
const ROUTE_TO_FEED_URL: Record<string, string> = {
  // IRT/IND/BMT trunk (default "gtfs" feed)
  "1": `${MTA_BASE}/nyct%2Fgtfs`,
  "2": `${MTA_BASE}/nyct%2Fgtfs`,
  "3": `${MTA_BASE}/nyct%2Fgtfs`,
  "4": `${MTA_BASE}/nyct%2Fgtfs`,
  "5": `${MTA_BASE}/nyct%2Fgtfs`,
  "6": `${MTA_BASE}/nyct%2Fgtfs`,
  S: `${MTA_BASE}/nyct%2Fgtfs`, // shuttle designator in station data

  // 7 line
  "7": `${MTA_BASE}/nyct%2Fgtfs-7`,

  // ACE
  A: `${MTA_BASE}/nyct%2Fgtfs-ace`,
  C: `${MTA_BASE}/nyct%2Fgtfs-ace`,
  E: `${MTA_BASE}/nyct%2Fgtfs-ace`,

  // BDFM
  B: `${MTA_BASE}/nyct%2Fgtfs-bdfm`,
  D: `${MTA_BASE}/nyct%2Fgtfs-bdfm`,
  F: `${MTA_BASE}/nyct%2Fgtfs-bdfm`,
  M: `${MTA_BASE}/nyct%2Fgtfs-bdfm`,

  // G
  G: `${MTA_BASE}/nyct%2Fgtfs-g`,

  // JZ
  J: `${MTA_BASE}/nyct%2Fgtfs-jz`,
  Z: `${MTA_BASE}/nyct%2Fgtfs-jz`,

  // L
  L: `${MTA_BASE}/nyct%2Fgtfs-l`,

  // NQRW
  N: `${MTA_BASE}/nyct%2Fgtfs-nqrw`,
  Q: `${MTA_BASE}/nyct%2Fgtfs-nqrw`,
  R: `${MTA_BASE}/nyct%2Fgtfs-nqrw`,
  W: `${MTA_BASE}/nyct%2Fgtfs-nqrw`,

  // Staten Island Railway (station data may use SIR)
  SI: `${MTA_BASE}/nyct%2Fgtfs-si`,
  SIR: `${MTA_BASE}/nyct%2Fgtfs-si`,
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function routesForStops(stopIds: string[]): string[] {
  const routes: string[] = [];
  for (const id of stopIds) {
    for (const r of routesForStopId(id)) routes.push((r || "").toUpperCase());
  }
  return unique(routes);
}

function feedUrlsForRoutes(routes: string[]): string[] {
  const urls = new Set<string>();
  for (const r of routes) {
    const key = (r || "").toUpperCase();
    const url = ROUTE_TO_FEED_URL[key];
    if (url) {
      urls.add(url);
    } else {
      // Fallback to the default trunk feed when an unknown route code appears
      urls.add(`${MTA_BASE}/nyct%2Fgtfs`);
    }
  }
  return Array.from(urls);
}

async function fetchFeed(url: string): Promise<gtfs.FeedMessage | null> {
  try {
    const res = await fetch(url, {
      // Avoid edge runtime fetch caching; upstream data is real-time
      cache: "no-store",
      headers: {
        "x-api-key": process.env.MTA_API_KEY || "",
        Accept: "application/x-protobuf",
      },
    });

    if (!res.ok) {
      return null;
    }

    // Read raw bytes only; never attempt text decoding
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.byteLength === 0) {
      return null;
    }

    // Guard: if response starts with '<' or '{', it's likely HTML/JSON, not protobuf
    const firstByte = bytes[0];
    if (firstByte === 0x3c /* '<' */ || firstByte === 0x7b /* '{' */) {
      let preview = "";
      try {
        preview = new TextDecoder("utf-8").decode(bytes.slice(0, 200));
      } catch {}
      return null;
    }

    try {
      return gtfs.FeedMessage.decode(bytes);
    } catch (decodeErr) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

export async function fetchAllSubwayFeeds(): Promise<gtfs.FeedMessage[]> {
  const feeds = await Promise.all(SUBWAY_FEED_URLS.map((u) => fetchFeed(u)));
  return feeds.filter(Boolean) as gtfs.FeedMessage[];
}

function toEpochSeconds(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  // protobufjs Long
  const maybeObj = value as { toNumber?: () => number };
  if (maybeObj && typeof maybeObj.toNumber === "function") {
    try {
      return maybeObj.toNumber();
    } catch {
      // fall through
    }
  }
  const n = Number(value as unknown);
  return Number.isFinite(n) ? n : 0;
}

export function inferDirectionFromStopId(stopId: string): "N" | "S" | "" {
  const last = stopId.at(-1);
  if (last === "N" || last === "S") return last;
  return "";
}

export function formatDirectionLabel(dir: "N" | "S" | ""): string {
  if (dir === "N") return "uptown";
  if (dir === "S") return "downtown";
  return "";
}

export async function getArrivalsForStops(
  stopIds: string[],
  options?: { maxPerStop?: number; includeCanceled?: boolean }
): Promise<Record<string, Arrival[]>> {
  const maxPerStop = options?.maxPerStop ?? 10;
  const includeCanceled = options?.includeCanceled ?? false;

  // Determine minimal set of feeds based on the routes that serve the requested stops
  const servingRoutes = routesForStops(stopIds);
  const feedUrls = feedUrlsForRoutes(servingRoutes);
  const feedsToFetch = feedUrls.length > 0 ? feedUrls : SUBWAY_FEED_URLS;

  const feeds = await Promise.all(feedsToFetch.map((u) => fetchFeed(u)));
  const validFeeds = feeds.filter(Boolean) as gtfs.FeedMessage[];

  const nowSec = Math.floor(Date.now() / 1000);

  const stopIdSet = new Set(stopIds);
  const results: Record<string, Arrival[]> = Object.fromEntries(
    stopIds.map((id) => [id, [] as Arrival[]])
  );

  for (const feed of validFeeds) {
    for (const entity of feed.entity) {
      if (!entity.tripUpdate) continue;
      const tu = entity.tripUpdate;
      // Skip canceled trips unless explicitly requested
      if (
        !includeCanceled &&
        tu.trip &&
        tu.trip.scheduleRelationship ===
          gtfs.TripDescriptor.ScheduleRelationship.CANCELED
      ) {
        continue;
      }
      const routeId = tu.trip?.routeId ?? "";
      const tripId = tu.trip?.tripId ?? undefined;

      for (const stu of tu.stopTimeUpdate ?? []) {
        const sId = stu.stopId ?? "";
        if (!stopIdSet.has(sId)) continue;
        const arrivalTime = toEpochSeconds(stu.arrival?.time);
        const departureTime = toEpochSeconds(stu.departure?.time);
        const when = arrivalTime || departureTime;
        if (!when) continue;
        // Ignore very stale predictions
        if (when < nowSec - 120) continue;

        results[sId].push({
          routeId,
          stopId: sId,
          arrivalEpochSec: when,
          tripId,
        });
      }
    }
  }

  // Sort and trim
  for (const id of Object.keys(results)) {
    results[id].sort((a, b) => a.arrivalEpochSec - b.arrivalEpochSec);
    if (results[id].length > maxPerStop) {
      results[id] = results[id].slice(0, maxPerStop);
    }
  }

  return results;
}

export function formatWhen(epochSec: number): string {
  const ms = epochSec * 1000 - Date.now();
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (ms <= 15000) return "due";
  if (min <= 0) return `${sec}s`;
  return `${min}m`;
}

export type ArrivalCell = { route: string; when: string };
export type ArrivalGroup = {
  base: string;
  north: ArrivalCell[];
  south: ArrivalCell[];
};

export function groupArrivalsTwoColumns(
  data: Record<string, Arrival[]>
): ArrivalGroup[] {
  const groups = new Map<string, { N: Arrival[]; S: Arrival[] }>();
  const stopIds = Object.keys(data);
  for (const stopId of stopIds) {
    const dir = inferDirectionFromStopId(stopId);
    const base = dir ? stopId.slice(0, -1) : stopId;
    const entry = groups.get(base) || { N: [], S: [] };
    if (dir === "N") entry.N = data[stopId];
    else if (dir === "S") entry.S = data[stopId];
    else entry.N = data[stopId];
    groups.set(base, entry);
  }
  const out: ArrivalGroup[] = [];
  for (const [base, { N, S }] of Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const north: ArrivalCell[] = (N || []).map((a) => ({
      route: a.routeId || "?",
      when: formatWhen(a.arrivalEpochSec),
    }));
    const south: ArrivalCell[] = (S || []).map((a) => ({
      route: a.routeId || "?",
      when: formatWhen(a.arrivalEpochSec),
    }));
    out.push({ base, north, south });
  }
  return out;
}

export function renderPlainTextArrivals(
  data: Record<string, Arrival[]>
): string {
  const lines: string[] = [];
  const now = new Date();
  lines.push("NYC Subway Arrivals");
  lines.push(`now: ${now.toLocaleString(undefined, { hour12: false })}`);
  lines.push("");

  const stopIds = Object.keys(data).sort();
  if (stopIds.length === 0) {
    lines.push("No stops specified.");
    return lines.join("\n");
  }

  // Group by base stop (strip trailing N/S when present)
  const groups = new Map<string, { N: Arrival[]; S: Arrival[] }>();
  for (const stopId of stopIds) {
    const dir = inferDirectionFromStopId(stopId);
    const base = dir ? stopId.slice(0, -1) : stopId;
    const entry = groups.get(base) || { N: [], S: [] };
    if (dir === "N") entry.N = data[stopId];
    else if (dir === "S") entry.S = data[stopId];
    else entry.N = data[stopId]; // if no dir, treat as N
    groups.set(base, entry);
  }

  for (const [base, { N, S }] of Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    lines.push(`${base}`);
    const leftHeader = "uptown";
    const rightHeader = "downtown";

    const leftRoutes = (N || []).map((a) => a.routeId || "?");
    const rightRoutes = (S || []).map((a) => a.routeId || "?");
    const routeWidth = Math.max(
      2,
      ...leftRoutes.map((r) => r.length),
      ...rightRoutes.map((r) => r.length)
    );

    const leftCol: string[] = (N || []).map(
      (a) =>
        `${(a.routeId || "?").padEnd(routeWidth)} ${formatWhen(
          a.arrivalEpochSec
        )}`
    );
    const rightCol: string[] = (S || []).map(
      (a) =>
        `${(a.routeId || "?").padEnd(routeWidth)} ${formatWhen(
          a.arrivalEpochSec
        )}`
    );

    const leftWidth = Math.max(
      leftHeader.length,
      ...leftCol.map((s) => s.length),
      12
    );
    const gap = "   "; // fixed spacing between columns

    // Header row for columns (no divider)
    const header = `${leftHeader.padEnd(leftWidth)}${gap}${rightHeader}`;
    lines.push(header);

    const rows = Math.max(leftCol.length, rightCol.length);
    if (rows === 0) {
      lines.push(
        `${"- no upcoming trains".padEnd(leftWidth)}${gap}- no upcoming trains`
      );
    } else {
      for (let i = 0; i < rows; i++) {
        const left = leftCol[i]
          ? leftCol[i].padEnd(leftWidth)
          : "".padEnd(leftWidth);
        const right = rightCol[i] ?? "";
        lines.push(`${left}${gap}${right}`);
      }
    }
    lines.push("");
  }

  lines.push("data source: MTA GTFS-Realtime");
  return lines.join("\n");
}

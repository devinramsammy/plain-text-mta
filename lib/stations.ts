import { stationsData } from "@/lib/stations_data";

export type StationRecord = {
  complexId: string;
  isComplex: boolean;
  numberOfStationsInComplex: number;
  stopName: string;
  displayName: string;
  constituentStationNames: string;
  stationIds: string;
  gtfsStopIds: string[];
  borough: string;
  routes: string[];
  structureType: string;
  latitude: number;
  longitude: number;
  ada: number;
  adaNotes?: string | null;
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const toNameKey = normalizeKey;

// Use pre-extracted, hardcoded station data
const allStations: StationRecord[] = stationsData as unknown as StationRecord[];
const gtfsIdToName = new Map<string, string>();
const gtfsIdToRoutes = new Map<string, Set<string>>();
const lineToStopIds = new Map<string, Set<string>>();
const nameKeyToStations = new Map<string, StationRecord[]>();

for (const station of allStations) {
  const {
    stopName,
    displayName,
    constituentStationNames,
    gtfsStopIds,
    routes,
  } = station;

  // id -> name mapping
  for (const id of gtfsStopIds) {
    if (!gtfsIdToName.has(id)) gtfsIdToName.set(id, stopName);
  }

  // id -> routes mapping
  for (const id of gtfsStopIds) {
    const set = gtfsIdToRoutes.get(id) ?? new Set<string>();
    for (const line of routes) set.add(line);
    gtfsIdToRoutes.set(id, set);
  }

  // line -> ids mapping
  for (const line of routes) {
    if (!lineToStopIds.has(line)) lineToStopIds.set(line, new Set());
    const set = lineToStopIds.get(line)!;
    for (const id of gtfsStopIds) set.add(id);
  }

  // name key -> stations mapping (use multiple aliases)
  const nameKeys = new Set<string>();
  if (stopName) nameKeys.add(normalizeKey(stopName));
  if (displayName) nameKeys.add(normalizeKey(displayName));
  if (constituentStationNames)
    nameKeys.add(normalizeKey(constituentStationNames));
  for (const key of nameKeys) {
    const list = nameKeyToStations.get(key) ?? [];
    list.push(station);
    nameKeyToStations.set(key, list);
  }
}

export function getAllLines(): string[] {
  return Array.from(lineToStopIds.keys()).sort();
}

export function lookupStationsByNameKey(name: string): StationRecord[] {
  const key = normalizeKey(name);
  return nameKeyToStations.get(key) ?? [];
}

export function lookupLineStops(line: string): {
  gtfsStopIds: string[];
  stations: StationRecord[];
} {
  const key = line.trim().toUpperCase();
  const ids = Array.from(lineToStopIds.get(key) ?? new Set<string>());
  const stations = allStations.filter((s) => s.routes.includes(key));
  return { gtfsStopIds: ids, stations };
}

export function nameForStopId(stopId: string): string | undefined {
  return gtfsIdToName.get(stopId);
}

export function idToNameMapForIds(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const name = nameForStopId(id);
    if (name) out[id] = name;
  }
  return out;
}

export function routesForStopId(stopId: string): string[] {
  // Station data uses base stop IDs without N/S suffix. Strip if present.
  const baseId =
    stopId.endsWith("N") || stopId.endsWith("S") ? stopId.slice(0, -1) : stopId;
  const set = gtfsIdToRoutes.get(baseId);
  return set ? Array.from(set) : [];
}

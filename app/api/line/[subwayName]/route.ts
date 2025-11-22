import { NextRequest } from "next/server";
import { lookupLineStops, idToNameMapForIds } from "@/lib/stations";

// Purpose: Return GTFS stop IDs and station details for a subway line.
// Input: path param `subwayName` (string, case-insensitive; normalized uppercase)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ subwayName: string }> }
) {
  const { subwayName } = await context.params;
  const lineKey = String(subwayName || "").toUpperCase();
  const { gtfsStopIds, stations } = lookupLineStops(lineKey);

  if (!gtfsStopIds || gtfsStopIds.length === 0) {
    const body = {
      error: "Unknown subway line",
      line: lineKey,
    };
    return new Response(JSON.stringify(body), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const idToName = idToNameMapForIds(gtfsStopIds);

  const body = {
    line: lineKey,
    gtfsStopIds,
    idToName,
    stations: stations.map((s) => ({
      name: s.stopName,
      displayName: s.displayName,
      complexId: s.complexId,
      stationIds: s.stationIds,
      borough: s.borough,
      routes: s.routes,
      gtfsStopIds: s.gtfsStopIds,
      latitude: s.latitude,
      longitude: s.longitude,
      ada: s.ada,
      adaNotes: s.adaNotes ?? undefined,
      structureType: s.structureType,
      isComplex: s.isComplex,
      numberOfStationsInComplex: s.numberOfStationsInComplex,
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

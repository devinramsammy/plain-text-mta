import { NextRequest } from "next/server";
import { lookupStationsByNameKey, idToNameMapForIds } from "@/lib/stations";

// Purpose: Return station details and GTFS stop IDs for a given location name.
// Input: path param `locationName` (string, case/spacing insensitive)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ locationName: string }> }
) {
  const { locationName } = await context.params;
  const locationKey = String(locationName || "");
  const stations = lookupStationsByNameKey(locationKey);

  if (!stations || stations.length === 0) {
    const body = {
      error: "Unknown location",
      location: locationKey,
    };
    return new Response(JSON.stringify(body), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const gtfsStopIds = Array.from(
    new Set(stations.flatMap((s) => s.gtfsStopIds))
  );
  const idToName = idToNameMapForIds(gtfsStopIds);

  const body = {
    location: locationKey,
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

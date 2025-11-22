import { NextRequest } from "next/server";
import { getArrivalsForStops, renderPlainTextArrivals } from "@/lib/mta";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stopParam =
    searchParams.get("stopId") || searchParams.get("stop") || "";
  const maxParam = Number(searchParams.get("max") || "");
  const maxPerStop =
    Number.isFinite(maxParam) && maxParam > 0 ? Math.min(maxParam, 20) : 10;

  const stops = stopParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const data = await getArrivalsForStops(stops, { maxPerStop });
    const body = renderPlainTextArrivals(data);
    return new Response(body, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "unknown error";
    return new Response(`error: ${message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

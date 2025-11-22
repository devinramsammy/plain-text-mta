import { lookupLineStops, toNameKey } from "@/lib/stations";
import HeaderWithBack from "@/app/components/HeaderWithBack";
import StationsWithStars from "@/app/components/StationsWithStars";

export default async function LinePage({
  params,
}: {
  params: Promise<{ subwayName: string }>;
}) {
  const { subwayName } = await params;
  const line = decodeURIComponent(subwayName).toUpperCase();
  const { stations } = lookupLineStops(line);

  if (!stations || stations.length === 0) {
    return <main>Line {line}: no stations found.</main>;
  }

  function toBoroughName(code: string): string {
    const c = (code || "").trim().toUpperCase();
    if (c === "M") return "Manhattan";
    if (c === "Q") return "Queens";
    if (c === "BK") return "Brooklyn";
    if (c === "BX") return "Bronx";
    if (c === "SI") return "Staten Island";
    return "Unknown";
  }

  const uniqueByKey = new Map<
    string,
    { name: string; key: string; borough: string }
  >();
  for (const s of stations) {
    const key = toNameKey(s.stopName);
    if (!uniqueByKey.has(key))
      uniqueByKey.set(key, {
        name: s.stopName,
        key,
        borough: toBoroughName(s.borough),
      });
  }

  const allStations = Array.from(uniqueByKey.values());
  const boroughOrder = [
    "Manhattan",
    "Queens",
    "Brooklyn",
    "Bronx",
    "Staten Island",
    "Unknown",
  ];
  const grouped = new Map<string, { name: string; key: string }[]>();
  for (const b of boroughOrder) grouped.set(b, []);
  for (const item of allStations) {
    const list = grouped.get(item.borough) || grouped.get("Unknown")!;
    list.push({ name: item.name, key: item.key });
  }
  for (const [b, list] of grouped) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    grouped.set(b, list);
  }

  return (
    <main>
      <div>
        <div style={{ textAlign: "left" }}>
          <HeaderWithBack backHref="/" title={`Line ${line} — Stations`} />
          {boroughOrder.map((b) => {
            const items = grouped.get(b) || [];
            if (items.length === 0) return null;
            return (
              <section
                key={b}
                style={{ paddingBottom: "16px", paddingLeft: "5px" }}
              >
                <p style={{ textAlign: "left" }}>{b}:</p>
                <StationsWithStars items={items} />
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

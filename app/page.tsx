import Favorites from "@/app/components/Favorites";
import ThemeToggle from "@/app/components/ThemeToggle";

export default async function HomePage() {
  const groups: string[][] = [
    ["1", "2", "3"],
    ["B", "D", "F", "M"],
    ["N", "Q", "R", "W"],
    ["4", "5", "6"],
    ["A", "C", "E"],
    ["7", "L", "G"],
    ["J", "Z"],
    ["S"],
    ["SIR"],
  ];

  return (
    <main>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <p style={{ margin: 0, textAlign: "left" }}>plaintextmta.com</p>
        <p style={{ margin: 0, textAlign: "right" }}>
          <ThemeToggle />
        </p>
      </div>
      <p>Select line → station → arrivals</p>
      <p>Data is polled every 5 seconds</p>
      {groups.map((row, i) => (
        <p key={i}>
          {row.map((line, idx) => (
            <span key={line}>
              <a
                href={`/line/${encodeURIComponent(line)}`}
                style={{
                  textDecoration: "none",
                  marginRight: row.length > 1 ? 10 : 0,
                  marginLeft: row.length > 1 ? 10 : 0,
                }}
              >
                [{line}]
              </a>
            </span>
          ))}
        </p>
      ))}
      <p
        style={{
          position: "fixed",
          bottom: 15,
          width: "100%",
          left: 0,
          right: 0,
        }}
      >
        Created by{" "}
        <strong>
          <a href="https://x.com/devindevdevin">devindevdevin</a>
        </strong>
      </p>
      <Favorites />
    </main>
  );
}

"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => {
        const current = resolvedTheme || theme;
        setTheme(current === "dark" ? "light" : "dark");
      }}
      aria-label="Toggle color mode"
      style={{
        fontWeight: 700,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        color: "#8f8fff",
      }}
    >
      <span className="theme-label" />
    </button>
  );
}

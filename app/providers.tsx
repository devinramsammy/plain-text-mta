"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import { useTheme } from "next-themes";

type ProvidersProps = {
  children: ReactNode;
};

function ThemeHydrator() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const applyThemeFromStorageOrSystem = () => {
      try {
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("theme")
            : null;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setTheme(stored);
          return;
        }
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      } catch (err) {
        console.error(err);
      }
    };

    applyThemeFromStorageOrSystem();

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        applyThemeFromStorageOrSystem();
      }
    };

    window.addEventListener("pageshow", onPageShow as EventListener);
    return () =>
      window.removeEventListener("pageshow", onPageShow as EventListener);
  }, [setTheme]);

  return null;
}

export default function ThemeProviders({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      <ThemeHydrator />
      {children}
    </ThemeProvider>
  );
}

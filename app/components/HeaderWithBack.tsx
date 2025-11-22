"use client";

import React from "react";
import BackButton from "@/app/components/BackButton";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function HeaderWithBack({
  title = "",
  backHref,
}: {
  title?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 8,
        textAlign: "left",
        marginBottom: 8,
      }}
    >
      <BackButton href={backHref} />
      <p style={{ margin: 0, textAlign: "center" }}>{title}</p>
      <div style={{ justifySelf: "end" }}>
        <ThemeToggle />
      </div>
    </div>
  );
}

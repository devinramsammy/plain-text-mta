"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  const icon = (
    <button
      aria-label="Go back"
      onClick={() => !href && router.back()}
      style={{
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        lineHeight: 1,
        font: "inherit",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        aria-hidden="true"
      >
        <path d="M15 6l-6 6 6 6" />
        <path d="M21 12H9" />
      </svg>
    </button>
  );
  if (href) {
    return (
      <Link
        href={href}
        aria-label="Go home"
        prefetch={false}
        style={{ lineHeight: 0, color: "inherit" }}
      >
        {icon}
      </Link>
    );
  }
  return icon;
}

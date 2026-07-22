"use client";

import React from "react";

/**
 * ── Weav design tokens ──────────────────────────────────────────────────
 * Shared "engineering schematic / drawing sheet" visual language.
 * Mirrors the sign-in page: cool graph-paper white, near-black ink,
 * a single live-orange signal accent, and a muted engineering-blue
 * circuit trace color. Import these instead of ad-hoc hexes so every
 * screen stays part of the same system.
 */

export const INK = "#15191F";
export const INK_SOFT = "#262C35"; // hover/pressed state for ink surfaces
export const SIGNAL = "#EA5A2B";
export const CIRCUIT = "#33608A";
export const GRAPHITE = "#74786F";
export const LINE = "#DBDED4";
export const PAPER = "#F2F4EF";
export const BODY = "#3F4339";

// Status semantics. SIGNAL is reserved for "live / actively running" so it
// stays a single meaningful accent rather than a generic brand color.
export const SUCCESS = "#1F8A6B";
export const FAILED = "#B23A2E";
export const AUX = "#4C7A73"; // secondary data-type accent (media / image)

export const display = {
  fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
} as const;

export const mono = {
  fontFamily: "var(--font-mono-schematic), ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/** Converts a #rrggbb hex string to an rgba() string at the given alpha. */
export function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Graph-paper background style, used for schematic/marketing surfaces only — never functional panels. */
export function schematicGridStyle(size = 28) {
  return {
    backgroundColor: PAPER,
    backgroundImage: `linear-gradient(to right, ${alpha(LINE, 0.7)} 1px, transparent 1px), linear-gradient(to bottom, ${alpha(LINE, 0.7)} 1px, transparent 1px)`,
    backgroundSize: `${size}px ${size}px`,
  } as React.CSSProperties;
}

/** Mount once per page — shared keyframes for dash-flow traces and pulsing status dots. */
export function WeavStyles() {
  return (
    <style>{`
      @media (prefers-reduced-motion: no-preference) {
        .weav-trace line { animation: weav-dash 1.1s linear infinite; }
        .weav-pulse-dot { animation: weav-pulse 2.2s ease-in-out infinite; }
      }
      @keyframes weav-dash { to { stroke-dashoffset: -16; } }
      @keyframes weav-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes weav-ring {
        0% { transform: scale(1); opacity: 0.5; }
        100% { transform: scale(2.4); opacity: 0; }
      }
    `}</style>
  );
}

/** Drafting-sheet corner registration marks. Parent must be `relative`. */
export function CornerMarks({
  color = INK,
  opacity = 0.16,
  size = "h-3 w-3",
}: {
  color?: string;
  opacity?: number;
  size?: string;
}) {
  const base = `pointer-events-none absolute ${size}`;
  const style = { borderColor: color, opacity };
  return (
    <>
      <span className={`${base} top-3 left-3 border-t border-l`} style={style} />
      <span className={`${base} top-3 right-3 border-t border-r`} style={style} />
      <span className={`${base} bottom-3 left-3 border-b border-l`} style={style} />
      <span className={`${base} bottom-3 right-3 border-b border-r`} style={style} />
    </>
  );
}

/** Small dashed connector with an arrowhead — the "trace" motif from the pipeline schematic. */
export function TraceLine({
  className = "h-4 w-8",
  color = CIRCUIT,
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 16"
      className={`weav-trace shrink-0 ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="2" y1="8" x2="54" y2="8" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" />
      <path d="M52 4 L60 8 L52 12" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StatusDot({ color, pulse = false, size = 6 }: { color: string; pulse?: boolean; size?: number }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${pulse ? "weav-pulse-dot" : ""}`}
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

/** Bordered, low-fill status pill: dot + mono uppercase label. Used across dashboard cards, node headers, run history. */
export function StatusChip({
  label,
  color,
  pulse = false,
  className = "",
}: {
  label: string;
  color: string;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${className}`}
      style={{ ...mono, borderColor: alpha(color, 0.35), backgroundColor: alpha(color, 0.08), color }}
    >
      <StatusDot color={color} pulse={pulse} />
      {label}
    </span>
  );
}

/** Bracketed spec-sheet tag, e.g. [A-1], in circuit blue. */
export function SpecTag({ id, color = CIRCUIT }: { id: string; color?: string }) {
  return (
    <span className="shrink-0 text-[10px] font-semibold" style={{ ...mono, color }}>
      [{id}]
    </span>
  );
}

/** The recurring logo lockup: ink chip + signal LED dot + mark, used at every entry point. */
export function LogoChip({ children, size = "h-9 w-9" }: { children: React.ReactNode; size?: string }) {
  return (
    <div
      className={`relative flex ${size} items-center justify-center rounded-md text-white shadow-sm`}
      style={{ backgroundColor: INK }}
    >
      {children}
    </div>
  );
}

/** Mono uppercase eyebrow/meta label used for field labels, drawing numbers, tab counters. */
export function MonoLabel({ children, color = GRAPHITE, className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider ${className}`} style={{ ...mono, color }}>
      {children}
    </span>
  );
}
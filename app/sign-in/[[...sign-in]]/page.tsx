"use client";

import React from "react";
import { WeavMark } from "../../components/weav-mark";
import { SignIn } from "../../components/auth-provider";
import { ArrowUpRight } from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────
// Paper: cool graph-paper white · Ink: near-black navy · Signal: live-orange
// accent · Circuit: muted engineering blue for traces/links · Graphite:
// muted supporting text · Line: hairline border tone.
const INK = "#15191F";
const SIGNAL = "#EA5A2B";
const CIRCUIT = "#33608A";
const GRAPHITE = "#74786F";
const LINE = "#DBDED4";

const display = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" };
const mono = { fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" };

function CornerMarks() {
  const base = "pointer-events-none absolute h-3 w-3 border-[#15191F]/20";
  return (
    <>
      <span className={`${base} top-4 left-4 border-t border-l`} />
      <span className={`${base} top-4 right-4 border-t border-r`} />
      <span className={`${base} bottom-4 left-4 border-b border-l`} />
      <span className={`${base} bottom-4 right-4 border-b border-r`} />
    </>
  );
}

function TraceLine() {
  return (
    <svg
      viewBox="0 0 64 16"
      className="trace-line h-4 w-8 shrink-0 sm:w-10"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="2" y1="8" x2="54" y2="8" stroke={CIRCUIT} strokeWidth="1.5" strokeDasharray="4 4" />
      <path d="M52 4 L60 8 L52 12" fill="none" stroke={CIRCUIT} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PipelineNode({
  label,
  sub,
  active = false,
}: {
  label: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`relative min-w-0 flex-1 rounded-md border px-3 py-3 ${
        active ? "border-[#EA5A2B]/40 bg-[#EA5A2B]/[0.06]" : "border-[#DBDED4] bg-white"
      }`}
    >
      <p className="truncate text-[11px] font-semibold tracking-tight" style={{ ...mono, color: active ? SIGNAL : INK }}>
        {label}
      </p>
      <p className="truncate text-[10px] mt-0.5" style={{ ...mono, color: GRAPHITE }}>
        {sub}
      </p>
      <span
        aria-hidden="true"
        className="absolute -bottom-[5px] left-1/2 h-[6px] w-[6px] -translate-x-1/2 rounded-[1px] border"
        style={{ backgroundColor: active ? SIGNAL : "#fff", borderColor: active ? SIGNAL : LINE }}
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full bg-white text-[#15191F] antialiased selection:bg-[#EA5A2B] selection:text-white">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .trace-line line { animation: weav-dash 1.1s linear infinite; }
        }
        @keyframes weav-dash { to { stroke-dashoffset: -16; } }
        @media (prefers-reduced-motion: no-preference) {
          .status-dot { animation: weav-pulse 2.2s ease-in-out infinite; }
        }
        @keyframes weav-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {/* ── Left: schematic panel ──────────────────────────────────────── */}
      <div
        className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-[#DBDED4] p-10 lg:flex lg:p-14"
        style={{
          backgroundColor: "#F2F4EF",
          backgroundImage:
            "linear-gradient(to right, rgba(219,222,212,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(219,222,212,0.7) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <CornerMarks />

        {/* Header row: mark + drawing reference */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-[#15191F] text-white shadow-sm">
              <span aria-hidden="true" className="absolute -top-[3px] -left-[3px] h-[6px] w-[6px] rounded-full bg-[#EA5A2B]" />
              <WeavMark className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight" style={display}>Weav</span>
              <span className="text-[10px] font-medium" style={{ ...mono, color: GRAPHITE }}>
                LLM WORKFLOW ENGINE
              </span>
            </div>
          </div>
          <span className="text-[10px]" style={{ ...mono, color: GRAPHITE }}>
            DWG WEAV-002 · REV C
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10 my-auto max-w-xl py-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-[#DBDED4] bg-white px-2.5 py-1 text-[10px] font-semibold" style={mono}>
            <span aria-hidden="true" className="status-dot h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span style={{ color: GRAPHITE }}>NODE GRAPH · LIVE</span>
          </div>

          <h1 className="mb-5 text-4xl font-bold leading-[1.15] tracking-tight lg:text-[2.75rem]" style={display}>
            Wire your models into{" "}
            <span style={{ color: SIGNAL }}>one pipeline.</span>
          </h1>

          <p className="mb-9 max-w-md text-[15px] leading-relaxed" style={{ color: "#3F4339" }}>
            Connect Gemini 2.5 Pro and Flash, image transforms, and background
            jobs into a single reactive graph — then watch every run in real time.
          </p>

          {/* Pipeline schematic */}
          <div className="rounded-lg border border-[#DBDED4] bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-0 sm:gap-1">
              <PipelineNode label="PROMPT" sub="request node" />
              <TraceLine />
              <PipelineNode label="GEMINI 2.5" sub="pro · synthesis" active />
              <TraceLine />
              <PipelineNode label="RESPONSE" sub="final output" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#DBDED4] pt-3 text-[10px] font-medium" style={mono}>
              <span className="flex items-center gap-1.5" style={{ color: "#1F8A6B" }}>
                <span aria-hidden="true" className="status-dot h-1.5 w-1.5 rounded-full bg-current" />
                STATUS · READY
              </span>
              <span style={{ color: GRAPHITE }}>LATENCY · 12MS</span>
              <span style={{ color: GRAPHITE }}>NODES · 3/3</span>
            </div>
          </div>

          {/* Spec list */}
          <div className="mt-8 space-y-2.5">
            <p className="text-[10px] font-semibold" style={{ ...mono, color: GRAPHITE }}>— SPECIFICATIONS —</p>
            {[
              ["A-1", "Real-time execution logs, per node"],
              ["A-2", "Async job runner via Trigger.dev"],
              ["A-3", "Zero added latency at the edge"],
            ].map(([tag, copy]) => (
              <div key={tag} className="flex items-baseline gap-2.5 text-[13px]">
                <span className="shrink-0 text-[10px] font-semibold" style={{ ...mono, color: CIRCUIT }}>[{tag}]</span>
                <span style={{ color: "#3F4339" }}>{copy}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Title block footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-[#DBDED4] pt-5 text-[10px]" style={{ ...mono, color: GRAPHITE }}>
          <span>© 2026 WEAV</span>
          <span>DWG WEAV-002 · REV C</span>
        </div>
      </div>

      {/* ── Right: form ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-6 sm:p-12 lg:p-16">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-[#15191F] text-white">
            <span aria-hidden="true" className="absolute -top-[3px] -left-[3px] h-[6px] w-[6px] rounded-full bg-[#EA5A2B]" />
            <WeavMark className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={display}>Weav</span>
        </div>

        <SignIn />

        <p className="mt-6 hidden items-center gap-1 text-[11px] lg:flex" style={{ ...mono, color: GRAPHITE }}>
          <ArrowUpRight className="h-3 w-3" />
          docs.weav.dev
        </p>
      </div>
    </div>
  );
}
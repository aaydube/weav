"use client";

import React from "react";
import { WeavMark } from "../../components/weav-mark";
import { SignUp } from "../../components/auth-provider";
import { Plus, ArrowUpRight } from "lucide-react";
import { INK, SIGNAL, CIRCUIT, GRAPHITE, LINE, display, mono } from "../../components/weav-theme";

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

function TraceLine({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg viewBox="0 0 64 16" className="trace-line h-4 w-8 shrink-0 sm:w-10" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1="2" y1="8" x2="54" y2="8"
        stroke={dashed ? LINE : CIRCUIT}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <path d="M52 4 L60 8 L52 12" fill="none" stroke={dashed ? LINE : CIRCUIT} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full bg-white text-[#15191F] antialiased selection:bg-[#EA5A2B] selection:text-white">
      <style>{`
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

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-[#15191F] text-white shadow-sm">
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

        <div className="relative z-10 my-auto max-w-xl py-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-[#DBDED4] bg-white px-2.5 py-1 text-[10px] font-semibold" style={mono}>
            <span aria-hidden="true" className="status-dot h-1.5 w-1.5 rounded-full bg-[#EA5A2B]" />
            <span style={{ color: GRAPHITE }}>NODE GRAPH · DRAFT</span>
          </div>

          <h1 className="mb-5 text-4xl font-bold leading-[1.15] tracking-tight lg:text-[2.75rem]" style={display}>
            Start wiring your{" "}
            <span style={{ color: SIGNAL }}>first pipeline.</span>
          </h1>

          <p className="mb-9 max-w-md text-[15px] leading-relaxed" style={{ color: "#3F4339" }}>
            Drag nodes onto an infinite canvas, connect Gemini 2.5 models, and
            ship automated workflows in minutes.
          </p>

          {/* Empty-canvas schematic: one real node, one placeholder */}
          <div className="rounded-lg border border-[#DBDED4] bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-0 sm:gap-1">
              <div className="relative min-w-0 flex-1 rounded-md border border-[#DBDED4] bg-white px-3 py-3">
                <p className="truncate text-[11px] font-semibold tracking-tight" style={{ ...mono, color: INK }}>CANVAS</p>
                <p className="truncate text-[10px] mt-0.5" style={{ ...mono, color: GRAPHITE }}>empty workspace</p>
                <span aria-hidden="true" className="absolute -bottom-[5px] left-1/2 h-[6px] w-[6px] -translate-x-1/2 rounded-[1px] border bg-white" style={{ borderColor: LINE }} />
              </div>
              <TraceLine dashed />
              <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-md border border-dashed border-[#DBDED4] bg-transparent px-3 py-3">
                <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: GRAPHITE }} />
                <p className="truncate text-[11px] font-semibold tracking-tight" style={{ ...mono, color: GRAPHITE }}>ADD NODE</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#DBDED4] pt-3 text-[10px] font-medium" style={mono}>
              <span className="flex items-center gap-1.5" style={{ color: SIGNAL }}>
                <span aria-hidden="true" className="status-dot h-1.5 w-1.5 rounded-full bg-current" />
                STATUS · DRAFT
              </span>
              <span style={{ color: GRAPHITE }}>NODES · 1/∞</span>
            </div>
          </div>

          {/* Spec list */}
          <div className="mt-8 space-y-2.5">
            <p className="text-[10px] font-semibold" style={{ ...mono, color: GRAPHITE }}>— SPECIFICATIONS —</p>
            {[
              ["A-1", "Infinite canvas with drag-and-drop wiring"],
              ["A-2", "Gemini 2.5 Pro and Flash, side by side"],
              ["A-3", "Live execution logs on every run"],
            ].map(([tag, copy]) => (
              <div key={tag} className="flex items-baseline gap-2.5 text-[13px]">
                <span className="shrink-0 text-[10px] font-semibold" style={{ ...mono, color: CIRCUIT }}>[{tag}]</span>
                <span style={{ color: "#3F4339" }}>{copy}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-[#DBDED4] pt-5 text-[10px]" style={{ ...mono, color: GRAPHITE }}>
          <span>© 2026 WEAV</span>
          <span>DWG WEAV-002 · REV C</span>
        </div>
      </div>

      {/* ── Right: form ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-6 sm:p-12 lg:p-16">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-[#15191F] text-white">
            <WeavMark className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={display}>Weav</span>
        </div>

        <SignUp />

        <p className="mt-6 hidden items-center gap-1 text-[11px] lg:flex" style={{ ...mono, color: GRAPHITE }}>
          <ArrowUpRight className="h-3 w-3" />
          docs.weav.dev
        </p>
      </div>
    </div>
  );
}
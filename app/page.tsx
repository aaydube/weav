"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WeavMark } from "./components/weav-mark";
import {
  INK,
  SIGNAL,
  CIRCUIT,
  GRAPHITE,
  LINE,
  PAPER,
  SUCCESS,
  display,
  mono,
  alpha,
  WeavStyles,
  CornerMarks,
  StatusChip,
  LogoChip,
  MonoLabel,
} from "./components/weav-theme";
import {
  Zap,
  Cpu,
  Workflow,
  ArrowRight,
  Sparkles,
  Layers,
  Terminal,
  ShieldCheck,
  Play,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Sliders,
  Boxes,
} from "lucide-react";

export default function LandingPage() {
  const [demoState, setDemoState] = useState<"idle" | "running" | "done">("idle");
  const [activeStep, setActiveStep] = useState(0);

  const runDemo = () => {
    if (demoState === "running") return;
    setDemoState("running");
    setActiveStep(1);

    setTimeout(() => setActiveStep(2), 800);
    setTimeout(() => setActiveStep(3), 1600);
    setTimeout(() => {
      setActiveStep(4);
      setDemoState("done");
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-[#F2F4EF] text-[#15191F] selection:bg-[#EA5A2B] selection:text-white flex flex-col font-sans">
      <WeavStyles />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#DBDED4] bg-[#F2F4EF]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <LogoChip size="h-8 w-8">
              <WeavMark className="w-5 h-5 text-[#EA5A2B]" />
            </LogoChip>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight" style={display}>
                WEAV
              </span>
              <span className="rounded-xs bg-[#15191F] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider" style={mono}>
                v1.0 ENGINE
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider" style={mono}>
            <a href="#features" className="text-[#74786F] hover:text-[#15191F] transition-colors">
              Capabilities
            </a>
            <a href="#demo" className="text-[#74786F] hover:text-[#15191F] transition-colors">
              Interactive Demo
            </a>
            <a href="#templates" className="text-[#74786F] hover:text-[#15191F] transition-colors">
              Templates
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-[#15191F] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#262C35] hover:shadow-md active:scale-98"
              style={mono}
            >
              <span>LAUNCH DASHBOARD</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#EA5A2B]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-[#DBDED4]">
        <div className="absolute inset-0 bg-schematic-grid opacity-60 pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DBDED4] bg-white px-3.5 py-1 text-xs font-semibold shadow-xs mb-8">
            <span className="h-2 w-2 rounded-full bg-[#EA5A2B] animate-ping" />
            <span style={mono} className="text-[#3F4339] text-[11px] uppercase tracking-wider">
              ENGINEERING-GRADE LLM WORKFLOW CANVAS
            </span>
          </div>

          <h1
            className="mx-auto max-w-4xl text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#15191F] leading-[1.08]"
            style={display}
          >
            Architect & Orchestrate <br />
            <span className="text-[#EA5A2B] underline decoration-[#15191F]/20 underline-offset-8">
              Visual AI Pipelines
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#3F4339] font-normal leading-relaxed">
            Build, test, and execute complex LLM workflows with type-safe graph routing, real-time node execution, multimodal vision capabilities, and live data telemetry.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-md bg-[#15191F] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#262C35] hover:scale-102 active:scale-98"
              style={mono}
            >
              <Workflow className="h-4 w-4 text-[#EA5A2B]" />
              <span>OPEN WORKFLOW CANVAS</span>
            </Link>

            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-md border border-[#15191F] bg-white px-6 py-3.5 text-sm font-bold text-[#15191F] transition-all hover:bg-[#F2F4EF]"
              style={mono}
            >
              <Play className="h-4 w-4 text-[#33608A]" />
              <span>TRY INTERACTIVE DEMO</span>
            </a>
          </div>

          {/* Feature Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-semibold text-[#74786F]" style={mono}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#1F8A6B]" />
              <span>DAG CYCLE PROTECTION</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#1F8A6B]" />
              <span>GEMINI MULTIMODAL VISION</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#1F8A6B]" />
              <span>TYPE-SAFE HANDLE CONNECTORS</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#1F8A6B]" />
              <span>REAL-TIME TELEMETRY</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Blueprint Demo Section */}
      <section id="demo" className="py-20 border-b border-[#DBDED4] bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <MonoLabel className="text-[#33608A] tracking-widest mb-2 block">
              [LIVE PREVIEW ENGINE]
            </MonoLabel>
            <h2 className="text-3xl sm:text-4xl font-bold" style={display}>
              Experience Visual Canvas Execution
            </h2>
            <p className="mt-2 text-sm text-[#74786F]">
              Click &quot;Run Live Simulation&quot; to test how nodes stream data through the visual schematic.
            </p>
          </div>

          {/* Interactive Blueprint Sandbox Card */}
          <div className="relative rounded-xl border border-[#15191F] bg-[#F2F4EF] p-6 shadow-xl">
            <CornerMarks />

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#DBDED4] pb-4 mb-6 gap-4">
              <div className="flex items-center gap-3">
                <StatusChip
                  label={demoState === "running" ? "EXECUTING PIPELINE" : demoState === "done" ? "EXECUTION COMPLETE" : "SYSTEM READY"}
                  color={demoState === "running" ? SIGNAL : demoState === "done" ? SUCCESS : CIRCUIT}
                  pulse={demoState === "running"}
                />
                <span className="text-xs font-mono text-[#74786F]">
                  Workflow: <strong className="text-[#15191F]">Multimodal Vision & Prompt Enhancer</strong>
                </span>
              </div>

              <button
                onClick={runDemo}
                disabled={demoState === "running"}
                className={`inline-flex items-center gap-2 rounded bg-[#15191F] px-4 py-2 text-xs font-bold text-white transition-all ${
                  demoState === "running" ? "opacity-60 cursor-not-allowed" : "hover:bg-[#EA5A2B]"
                }`}
                style={mono}
              >
                <Play className={`h-3.5 w-3.5 ${demoState === "running" ? "animate-spin" : ""}`} />
                <span>{demoState === "running" ? "EXECUTING PIPELINE..." : "RUN LIVE SIMULATION"}</span>
              </button>
            </div>

            {/* Schematic Flow Simulation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 relative">
              {/* Step 1: Input */}
              <div
                className={`relative rounded-lg border p-4 bg-white transition-all duration-300 ${
                  activeStep >= 1 ? "border-[#EA5A2B] ring-2 ring-[#EA5A2B]/20 shadow-md" : "border-[#DBDED4]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#33608A]" style={mono}>
                    [NODE 01: INPUT]
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#1F8A6B]" />
                </div>
                <div className="font-bold text-xs mb-1" style={display}>
                  Product Input & Photo
                </div>
                <p className="text-[11px] text-[#74786F] line-clamp-2">
                  &quot;Wireless headphones with noise-canceling & 40h battery&quot;
                </p>
                {activeStep === 1 && (
                  <div className="mt-2 text-[10px] font-mono text-[#EA5A2B] font-bold animate-pulse">
                    ⚡ Passing payload data...
                  </div>
                )}
              </div>

              {/* Step 2: Image Processing */}
              <div
                className={`relative rounded-lg border p-4 bg-white transition-all duration-300 ${
                  activeStep >= 2 ? "border-[#EA5A2B] ring-2 ring-[#EA5A2B]/20 shadow-md" : "border-[#DBDED4]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#33608A]" style={mono}>
                    [NODE 02: CROP]
                  </span>
                  <span className="h-2 w-2 rounded-full bg-[#1F8A6B]" />
                </div>
                <div className="font-bold text-xs mb-1" style={display}>
                  Aspect Crop Processor
                </div>
                <div className="text-[11px] font-mono text-[#3F4339] bg-[#F2F4EF] p-1.5 rounded text-center">
                  Ratio: 1:1 Tight
                </div>
                {activeStep === 2 && (
                  <div className="mt-2 text-[10px] font-mono text-[#EA5A2B] font-bold animate-pulse">
                    ⚙️ Processing crop matrix...
                  </div>
                )}
              </div>

              {/* Step 3: Gemini Vision LLM */}
              <div
                className={`relative rounded-lg border p-4 bg-white transition-all duration-300 ${
                  activeStep >= 3 ? "border-[#EA5A2B] ring-2 ring-[#EA5A2B]/20 shadow-md" : "border-[#DBDED4]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA5A2B]" style={mono}>
                    [NODE 03: GEMINI AI]
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-[#EA5A2B]" />
                </div>
                <div className="font-bold text-xs mb-1" style={display}>
                  Gemini Flash Vision
                </div>
                <p className="text-[11px] text-[#74786F]">Generating ad copy & feature tags...</p>
                {activeStep === 3 && (
                  <div className="mt-2 text-[10px] font-mono text-[#EA5A2B] font-bold animate-pulse">
                    🧠 Generating LLM completion...
                  </div>
                )}
              </div>

              {/* Step 4: Output Display */}
              <div
                className={`relative rounded-lg border p-4 bg-white transition-all duration-300 ${
                  activeStep >= 4 ? "border-[#1F8A6B] ring-2 ring-[#1F8A6B]/20 shadow-md" : "border-[#DBDED4]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F8A6B]" style={mono}>
                    [NODE 04: OUTPUT]
                  </span>
                  <CheckCircle className="h-3.5 w-3.5 text-[#1F8A6B]" />
                </div>
                <div className="font-bold text-xs mb-1" style={display}>
                  Formatted Output
                </div>
                <p className="text-[11px] text-[#1F8A6B] font-mono font-medium">
                  {activeStep >= 4 ? "✅ Copy & cropped image ready!" : "Waiting for completion..."}
                </p>
              </div>
            </div>

            {/* Bottom Telemetry Log */}
            <div className="mt-4 rounded-md bg-[#15191F] p-3 text-xs font-mono text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#EA5A2B]" />
                <span>
                  {activeStep === 0 && "System initialized. Click 'Run Live Simulation' to start."}
                  {activeStep === 1 && "[02:17:01] Node input payload validated. Passing downstream..."}
                  {activeStep === 2 && "[02:17:02] Crop matrix applied (1:1 aspect ratio, 800x800)."}
                  {activeStep === 3 && "[02:17:03] Gemini AI streaming inference response (284 tokens)..."}
                  {activeStep === 4 && "[02:17:04] Workflow executed successfully in 2.4s. 0 errors."}
                </span>
              </div>
              <span className="text-[10px] text-[#74786F] uppercase">[STATUS: LOG_OK]</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="features" className="py-20 border-b border-[#DBDED4]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <MonoLabel className="text-[#EA5A2B] tracking-widest block mb-2">
              [SYSTEM CAPABILITIES]
            </MonoLabel>
            <h2 className="text-3xl sm:text-4xl font-bold" style={display}>
              Engineered for Modern AI Orchestration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-lg border border-[#DBDED4] bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#15191F] text-white mb-4">
                <Workflow className="h-5 w-5 text-[#EA5A2B]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={display}>
                Visual Graph Builder
              </h3>
              <p className="text-sm text-[#74786F] leading-relaxed">
                Fluid canvas powered by React Flow with strict Directed Acyclic Graph (DAG) cycle detection and instant connection validation.
              </p>
            </div>

            <div className="rounded-lg border border-[#DBDED4] bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#15191F] text-white mb-4">
                <Cpu className="h-5 w-5 text-[#33608A]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={display}>
                Gemini Multimodal Models
              </h3>
              <p className="text-sm text-[#74786F] leading-relaxed">
                Seamlessly mix prompt generation, image analysis, image cropping, and structured JSON transformers into a single graph.
              </p>
            </div>

            <div className="rounded-lg border border-[#DBDED4] bg-white p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#15191F] text-white mb-4">
                <ShieldCheck className="h-5 w-5 text-[#1F8A6B]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={display}>
                Type-Safe Connections
              </h3>
              <p className="text-sm text-[#74786F] leading-relaxed">
                Connect node handles safely with built-in data type validation matching text, image arrays, JSON objects, and boolean triggers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-built Templates Carousel Showcase */}
      <section id="templates" className="py-20 bg-white border-b border-[#DBDED4]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between mb-12 gap-4">
            <div>
              <MonoLabel className="text-[#33608A] tracking-widest block mb-2">
                [STARTER PACK]
              </MonoLabel>
              <h2 className="text-3xl font-bold" style={display}>
                Ready-to-Run Workflow Templates
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EA5A2B] hover:underline"
              style={mono}
            >
              <span>VIEW ALL TEMPLATES</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group rounded-xl border border-[#DBDED4] bg-[#F2F4EF] p-5 hover:border-[#15191F] transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded bg-[#33608A] px-2 py-0.5 text-[10px] font-bold text-white uppercase" style={mono}>
                  VISION & QA
                </span>
                <span className="text-[10px] font-mono text-[#74786F]">4 NODES</span>
              </div>
              <h4 className="text-base font-bold text-[#15191F] mb-1" style={display}>
                Multimodal Vision & Copy Creator
              </h4>
              <p className="text-xs text-[#74786F] mb-4">
                Takes product photos, crops them to standard aspect ratios, and generates marketing copy using Gemini.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191F] group-hover:text-[#EA5A2B]"
                style={mono}
              >
                <span>USE THIS TEMPLATE</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="group rounded-xl border border-[#DBDED4] bg-[#F2F4EF] p-5 hover:border-[#15191F] transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded bg-[#EA5A2B] px-2 py-0.5 text-[10px] font-bold text-white uppercase" style={mono}>
                  AUTOMATION
                </span>
                <span className="text-[10px] font-mono text-[#74786F]">3 NODES</span>
              </div>
              <h4 className="text-base font-bold text-[#15191F] mb-1" style={display}>
                HTTP Webhook Data Enricher
              </h4>
              <p className="text-xs text-[#74786F] mb-4">
                Listens for incoming webhooks, transforms payload JSON structure, and triggers downstream AI summaries.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191F] group-hover:text-[#EA5A2B]"
                style={mono}
              >
                <span>USE THIS TEMPLATE</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="group rounded-xl border border-[#DBDED4] bg-[#F2F4EF] p-5 hover:border-[#15191F] transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="rounded bg-[#1F8A6B] px-2 py-0.5 text-[10px] font-bold text-white uppercase" style={mono}>
                  LOGIC ROUTER
                </span>
                <span className="text-[10px] font-mono text-[#74786F]">5 NODES</span>
              </div>
              <h4 className="text-base font-bold text-[#15191F] mb-1" style={display}>
                Smart Condition Branching
              </h4>
              <p className="text-xs text-[#74786F] mb-4">
                Evaluates input criteria using conditional operators and routes execution path dynamically.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191F] group-hover:text-[#EA5A2B]"
                style={mono}
              >
                <span>USE THIS TEMPLATE</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#DBDED4] bg-[#15191F] text-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoChip size="h-7 w-7">
              <WeavMark className="w-4 h-4 text-[#EA5A2B]" />
            </LogoChip>
            <span className="font-bold text-base tracking-tight" style={display}>
              WEAV WORKFLOW ENGINE
            </span>
          </div>

          <div className="text-xs text-[#74786F] font-mono">
            ENGINEERING SCHEMATIC SPECIFICATION © {new Date().getFullYear()} WEAV LABS
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <Link href="/dashboard" className="text-white hover:text-[#EA5A2B] transition-colors">
              DASHBOARD
            </Link>
            <span>•</span>
            <a href="#features" className="text-white hover:text-[#EA5A2B] transition-colors">
              CAPABILITIES
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

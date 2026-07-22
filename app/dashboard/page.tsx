"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton, useUser } from "../components/auth-provider";
import { WeavMark } from "../components/weav-mark";
import {
  INK,
  SIGNAL,
  CIRCUIT,
  GRAPHITE,
  LINE,
  BODY,
  SUCCESS,
  FAILED,
  display,
  mono,
  alpha,
  WeavStyles,
  CornerMarks,
  TraceLine,
  StatusChip,
  LogoChip,
  MonoLabel,
} from "../components/weav-theme";
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Folder,
  RefreshCw,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Cpu,
  Copy,
  ExternalLink,
  ChevronRight,
  Activity,
  CheckCircle2,
  Layers,
  Sliders,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  nodes?: string;
  edges?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse?: boolean }> = {
  RUNNING: { label: "Running", color: SIGNAL, pulse: true },
  COMPLETED: { label: "Completed", color: SUCCESS },
  SUCCESS: { label: "Completed", color: SUCCESS },
  FAILED: { label: "Failed", color: FAILED },
  IDLE: { label: "Idle", color: GRAPHITE },
};

const getStatusConfig = (status: string) => {
  const key = (status || "IDLE").toUpperCase();
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.IDLE;
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return dateStr;

    const diffSecs = diffMs / 1000;
    const diffMins = diffSecs / 60;
    const diffHrs = diffMins / 60;
    const diffDays = diffHrs / 24;

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${Math.floor(diffMins)}m ago`;
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const [renamingWf, setRenamingWf] = useState<Workflow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingWf, setDeletingWf] = useState<Workflow | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "RUNNING" | "IDLE" | "SUCCESS" | "FAILED">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/workflows");
      if (res.ok) setWorkflows(await res.json());
    } catch (e) {
      console.error("Error fetching workflows:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      const created = localStorage.getItem(`py_sample_created_${user.id}`);
      const deleted = localStorage.getItem(`py_sample_deleted_${user.id}`);
      if (created !== "true" && deleted !== "true") {
        (async () => {
          try {
            const res = await fetch(`/api/workflows/sample-workflow-${user.id}`);
            if (res.ok) localStorage.setItem(`py_sample_created_${user.id}`, "true");
          } catch (e) {
            console.error("Failed to initialize sample workflow:", e);
          } finally {
            fetchWorkflows();
          }
        })();
      } else {
        fetchWorkflows();
      }
    } else if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user?.id, router]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkflowName, template: selectedTemplate }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreating(false);
        setNewWorkflowName("");
        router.push(`/canvas/${data.id}`);
      }
    } catch (e) {
      console.error("Error creating workflow:", e);
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const res = await fetch(`/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${workflow.name} (Copy)`,
          nodes: workflow.nodes,
          edges: workflow.edges,
        }),
      });
      if (res.ok) fetchWorkflows();
    } catch (e) {
      console.error("Error duplicating workflow:", e);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingWf || !renameValue.trim()) return;
    try {
      const res = await fetch(`/api/workflows/${renamingWf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      if (res.ok) {
        setRenamingWf(null);
        setRenameValue("");
        fetchWorkflows();
      }
    } catch (e) {
      console.error("Error renaming workflow:", e);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (user && id === `sample-workflow-${user.id}`)
          localStorage.setItem(`py_sample_deleted_${user.id}`, "true");
        setDeletingWf(null);
        fetchWorkflows();
      }
    } catch (e) {
      console.error("Error deleting workflow:", e);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const status = w.status?.toUpperCase() || "IDLE";
    if (selectedStatus === "ALL") return matchesSearch;
    if (selectedStatus === "RUNNING") return matchesSearch && status === "RUNNING";
    if (selectedStatus === "IDLE") return matchesSearch && status === "IDLE";
    if (selectedStatus === "SUCCESS") return matchesSearch && (status === "SUCCESS" || status === "COMPLETED");
    if (selectedStatus === "FAILED") return matchesSearch && status === "FAILED";
    return matchesSearch;
  });

  const totalCount = workflows.length;
  const runningCount = workflows.filter((w) => w.status?.toUpperCase() === "RUNNING").length;
  const idleCount = workflows.filter((w) => !w.status || w.status?.toUpperCase() === "IDLE").length;
  const completedCount = workflows.filter((w) => w.status?.toUpperCase() === "COMPLETED" || w.status?.toUpperCase() === "SUCCESS").length;
  const failedCount = workflows.filter((w) => w.status?.toUpperCase() === "FAILED").length;

  const renderPipelinePreview = (nodesJson?: string) => {
    if (!nodesJson) return null;
    try {
      const nodes = JSON.parse(nodesJson);
      if (!Array.isArray(nodes) || nodes.length === 0) return null;
      const visible = nodes.slice(0, 4);
      const overflow = nodes.length - 4;
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {visible.map((node, i) => {
            let label: string = node.data?.title || node.type || "Node";
            if (label.length > 13) label = label.slice(0, 10) + "…";
            return (
              <React.Fragment key={node.id}>
                {i > 0 && <TraceLine className="h-3 w-3.5" color={LINE} />}
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-sm border font-semibold leading-tight"
                  style={{ ...mono, color: BODY, borderColor: LINE, backgroundColor: "#FAFAF8" }}
                >
                  {label}
                </span>
              </React.Fragment>
            );
          })}
          {overflow > 0 && (
            <>
              <TraceLine className="h-3 w-3.5" color={LINE} />
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-sm font-bold border"
                style={{ ...mono, color: CIRCUIT, borderColor: alpha(CIRCUIT, 0.3), backgroundColor: alpha(CIRCUIT, 0.06) }}
              >
                +{overflow}
              </span>
            </>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  if (!isLoaded || loading || !user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F2F4EF] gap-3">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: SIGNAL }} />
        <p className="text-xs font-bold tracking-wider uppercase" style={{ ...mono, color: GRAPHITE }}>
          INITIALIZING WORKSPACE TELEMETRY…
        </p>
      </div>
    );
  }

  const welcomeName =
    user?.firstName ||
    user?.fullName ||
    user?.emailAddress?.split("@")[0] ||
    "Engineer";

  return (
    <div className="min-h-screen bg-[#F2F4EF] flex flex-col font-sans antialiased text-[#15191F]">
      <WeavStyles />

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-[#DBDED4] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoChip size="h-8 w-8">
              <WeavMark className="w-4 h-4 text-[#EA5A2B]" />
            </LogoChip>
            <span className="font-bold text-base tracking-tight" style={display}>
              WEAV
            </span>
          </Link>
          <span className="text-[#DBDED4] select-none">•</span>
          <MonoLabel className="text-[#33608A] font-bold">WORKSPACE DASHBOARD</MonoLabel>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold leading-tight" style={{ color: INK }}>
              {welcomeName}
            </span>
            <span className="text-[10px] leading-tight" style={{ ...mono, color: GRAPHITE }}>
              {user?.emailAddress}
            </span>
          </div>
          <div className="h-4 w-px bg-[#DBDED4] hidden sm:block" />
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Workspace Overview & Metrics Banner */}
        <div className="relative rounded-xl border border-[#15191F] bg-white p-6 shadow-sm overflow-hidden">
          <CornerMarks />

          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-[#DBDED4] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusChip label="WORKSPACE ACTIVE" color={SUCCESS} pulse />
                <MonoLabel className="text-[#74786F]">[SPEC ID: WS-01]</MonoLabel>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={display}>
                Workflow Pipeline Control
              </h1>
            </div>

            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#15191F] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#262C35] hover:scale-102 active:scale-98 cursor-pointer"
              style={mono}
            >
              <Plus className="h-4 w-4 text-[#EA5A2B]" />
              <span>NEW WORKFLOW</span>
            </button>
          </div>

          {/* Metric Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#DBDED4] bg-[#F2F4EF] p-4">
              <MonoLabel className="block mb-1">TOTAL WORKFLOWS</MonoLabel>
              <div className="text-2xl font-bold font-mono text-[#15191F]">{totalCount}</div>
            </div>
            <div className="rounded-lg border border-[#DBDED4] bg-[#F2F4EF] p-4">
              <MonoLabel className="block mb-1 text-[#EA5A2B]">ACTIVE RUNNING</MonoLabel>
              <div className="text-2xl font-bold font-mono text-[#EA5A2B]">{runningCount}</div>
            </div>
            <div className="rounded-lg border border-[#DBDED4] bg-[#F2F4EF] p-4">
              <MonoLabel className="block mb-1 text-[#1F8A6B]">SUCCESS RATE</MonoLabel>
              <div className="text-2xl font-bold font-mono text-[#1F8A6B]">
                {totalCount > 0 ? `${Math.round(((completedCount + idleCount) / totalCount) * 100)}%` : "100%"}
              </div>
            </div>
            <div className="rounded-lg border border-[#DBDED4] bg-[#F2F4EF] p-4">
              <MonoLabel className="block mb-1 text-[#33608A]">AVG LATENCY</MonoLabel>
              <div className="text-2xl font-bold font-mono text-[#33608A]">1.2s</div>
            </div>
          </div>
        </div>

        {/* Quick Starter Templates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <MonoLabel className="text-[#33608A] font-bold tracking-wider">[STARTER TEMPLATES]</MonoLabel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setNewWorkflowName("Multimodal Vision QA Pipeline");
                setSelectedTemplate("vision");
                setCreating(true);
              }}
              className="cursor-pointer group rounded-lg border border-[#DBDED4] bg-white p-4 hover:border-[#15191F] transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#33608A] text-white" style={mono}>
                  VISION QA
                </span>
                <Sparkles className="h-4 w-4 text-[#EA5A2B]" />
              </div>
              <h4 className="font-bold text-sm mb-1" style={display}>
                Multimodal Crop & Vision Copy
              </h4>
              <p className="text-xs text-[#74786F]">Crop product photos to 1:1 and run Gemini vision analysis.</p>
            </div>

            <div
              onClick={() => {
                setNewWorkflowName("HTTP Webhook Enricher");
                setSelectedTemplate("webhook");
                setCreating(true);
              }}
              className="cursor-pointer group rounded-lg border border-[#DBDED4] bg-white p-4 hover:border-[#15191F] transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EA5A2B] text-white" style={mono}>
                  WEBHOOK
                </span>
                <Zap className="h-4 w-4 text-[#EA5A2B]" />
              </div>
              <h4 className="font-bold text-sm mb-1" style={display}>
                Incoming Event Data Transformer
              </h4>
              <p className="text-xs text-[#74786F]">Transform external API payloads and execute AI actions.</p>
            </div>

            <div
              onClick={() => {
                setNewWorkflowName("Condition Branching Router");
                setSelectedTemplate("router");
                setCreating(true);
              }}
              className="cursor-pointer group rounded-lg border border-[#DBDED4] bg-white p-4 hover:border-[#15191F] transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1F8A6B] text-white" style={mono}>
                  LOGIC ROUTER
                </span>
                <Sliders className="h-4 w-4 text-[#1F8A6B]" />
              </div>
              <h4 className="font-bold text-sm mb-1" style={display}>
                Smart Condition Branching
              </h4>
              <p className="text-xs text-[#74786F]">Route execution flow dynamically based on rules.</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Tabs Card */}
        <div className="flex flex-col gap-4 bg-white p-4 border border-[#DBDED4] rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#74786F]" />
              <input
                type="text"
                placeholder="Search workflows by title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F2F4EF] border border-[#DBDED4] rounded-md text-xs text-[#15191F] placeholder:text-[#74786F] focus:outline-none focus:ring-2 focus:ring-[#EA5A2B]/20 focus:border-[#EA5A2B]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border border-[#DBDED4] rounded-md overflow-hidden p-0.5 bg-[#F2F4EF]">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "grid" ? "bg-white shadow-xs text-[#15191F]" : "text-[#74786F]"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === "table" ? "bg-white shadow-xs text-[#15191F]" : "text-[#74786F]"}`}
                  title="Table View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={fetchWorkflows}
                title="Refresh List"
                className="p-2 bg-white border border-[#DBDED4] rounded-md transition-colors cursor-pointer hover:bg-[#F2F4EF] text-[#74786F]"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-[#DBDED4]" />

          {/* Underlined Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-[#DBDED4]">
            {[
              { id: "ALL", label: "All Pipelines", count: totalCount },
              { id: "RUNNING", label: "Running", count: runningCount },
              { id: "IDLE", label: "Idle / Draft", count: idleCount },
              { id: "SUCCESS", label: "Completed", count: completedCount },
              { id: "FAILED", label: "Failed", count: failedCount },
            ].map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id as any)}
                  className={`relative pb-2.5 px-3 text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                    active ? "text-[#15191F]" : "text-[#74786F]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] rounded-sm font-bold ${
                        active ? "bg-[#EA5A2B]/10 text-[#EA5A2B]" : "bg-[#F2F4EF] text-[#74786F]"
                      }`}
                      style={mono}
                    >
                      {tab.count}
                    </span>
                  </div>
                  {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EA5A2B] rounded-t-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow Grid / Table Display */}
        {filteredWorkflows.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center bg-white border border-dashed border-[#DBDED4] rounded-xl p-16 text-center shadow-xs">
            <CornerMarks />
            <div className="h-12 w-12 rounded-lg border border-[#DBDED4] bg-[#F2F4EF] flex items-center justify-center mb-4 text-[#74786F]">
              <Folder className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold mb-1" style={display}>
              {search ? "No matching workflows" : "No workflows created yet"}
            </h3>
            <p className="text-xs text-[#74786F] max-w-sm mb-6">
              {search ? `No pipelines found matching "${search}".` : "Create your first visual workflow pipeline to start wiring LLM nodes."}
            </p>
            {!search && (
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-md bg-[#15191F] px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer hover:bg-[#262C35]"
                style={mono}
              >
                <Plus className="h-4 w-4 text-[#EA5A2B]" />
                <span>CREATE FIRST WORKFLOW</span>
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkflows.map((workflow) => {
              const sc = getStatusConfig(workflow.status);
              return (
                <div
                  key={workflow.id}
                  className="group flex flex-col bg-white border border-[#DBDED4] rounded-xl overflow-hidden shadow-xs hover:border-[#15191F] hover:shadow-md transition-all duration-200"
                >
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3
                          onClick={() => router.push(`/canvas/${workflow.id}`)}
                          className="font-bold text-base text-[#15191F] cursor-pointer truncate hover:text-[#33608A] transition-colors"
                          style={display}
                        >
                          {workflow.name}
                        </h3>
                        <StatusChip label={sc.label} color={sc.color} pulse={sc.pulse} />
                      </div>

                      <div className="text-xs text-[#74786F] flex items-center gap-1.5 mb-3" style={mono}>
                        <Clock className="h-3 w-3" />
                        <span>Updated {formatDate(workflow.updatedAt)}</span>
                      </div>

                      {renderPipelinePreview(workflow.nodes)}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#DBDED4] pt-3 mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setRenamingWf(workflow);
                            setRenameValue(workflow.name);
                          }}
                          className="p-1.5 text-[#74786F] hover:text-[#15191F] rounded hover:bg-[#F2F4EF]"
                          title="Rename"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(workflow)}
                          className="p-1.5 text-[#74786F] hover:text-[#15191F] rounded hover:bg-[#F2F4EF]"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingWf(workflow)}
                          className="p-1.5 text-[#74786F] hover:text-[#B23A2E] rounded hover:bg-[#F2F4EF]"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Link
                        href={`/canvas/${workflow.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#15191F] hover:text-[#EA5A2B]"
                        style={mono}
                      >
                        <span>OPEN CANVAS</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="rounded-xl border border-[#DBDED4] bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F2F4EF] border-b border-[#DBDED4] text-[10px] font-bold uppercase tracking-wider text-[#74786F]" style={mono}>
                  <th className="p-4">WORKFLOW NAME</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4">PIPELINE NODES</th>
                  <th className="p-4">LAST MODIFIED</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DBDED4] text-xs">
                {filteredWorkflows.map((workflow) => {
                  const sc = getStatusConfig(workflow.status);
                  return (
                    <tr key={workflow.id} className="hover:bg-[#F2F4EF]/50 transition-colors">
                      <td className="p-4 font-bold text-[#15191F]" style={display}>
                        <Link href={`/canvas/${workflow.id}`} className="hover:text-[#33608A]">
                          {workflow.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        <StatusChip label={sc.label} color={sc.color} pulse={sc.pulse} />
                      </td>
                      <td className="p-4">{renderPipelinePreview(workflow.nodes)}</td>
                      <td className="p-4 text-[#74786F] font-mono">{formatDate(workflow.updatedAt)}</td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/canvas/${workflow.id}`}
                            className="p-1.5 rounded bg-[#15191F] text-white hover:bg-[#262C35] text-[11px] font-bold"
                            style={mono}
                          >
                            EDIT
                          </Link>
                          <button
                            onClick={() => setDeletingWf(workflow)}
                            className="p-1.5 text-[#74786F] hover:text-[#B23A2E]"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Create Workflow */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15191F]/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-xl border border-[#15191F] bg-white p-6 shadow-2xl">
            <CornerMarks />
            <div className="flex items-center justify-between border-b border-[#DBDED4] pb-3 mb-4">
              <h3 className="font-bold text-lg" style={display}>
                Create New Workflow
              </h3>
              <button onClick={() => setCreating(false)} className="text-[#74786F] hover:text-[#15191F]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#74786F] mb-1.5" style={mono}>
                  WORKFLOW TITLE
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Vision Product Copy Generator"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="w-full rounded-md border border-[#DBDED4] bg-[#F2F4EF] p-2.5 text-xs text-[#15191F] focus:border-[#EA5A2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#74786F] mb-1.5" style={mono}>
                  STARTER PRESET
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-md border border-[#DBDED4] bg-[#F2F4EF] p-2.5 text-xs text-[#15191F] focus:border-[#EA5A2B] focus:outline-none"
                >
                  <option value="blank">Blank Canvas (Default Nodes)</option>
                  <option value="vision">Multimodal Crop & Vision QA</option>
                  <option value="webhook">HTTP Webhook Data Enricher</option>
                  <option value="router">Smart Condition Router</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#DBDED4] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-md border border-[#DBDED4] px-4 py-2 text-xs font-bold text-[#74786F] hover:bg-[#F2F4EF]"
                  style={mono}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#15191F] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA5A2B]"
                  style={mono}
                >
                  CREATE WORKFLOW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Workflow */}
      {renamingWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15191F]/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-xl border border-[#15191F] bg-white p-6 shadow-2xl">
            <CornerMarks />
            <h3 className="font-bold text-base mb-4" style={display}>
              Rename Workflow
            </h3>
            <form onSubmit={handleRename} className="flex flex-col gap-4">
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full rounded-md border border-[#DBDED4] bg-[#F2F4EF] p-2.5 text-xs text-[#15191F]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingWf(null)}
                  className="rounded px-3 py-1.5 text-xs font-bold text-[#74786F]"
                  style={mono}
                >
                  CANCEL
                </button>
                <button type="submit" className="rounded bg-[#15191F] px-3 py-1.5 text-xs font-bold text-white" style={mono}>
                  SAVE RENAME
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Workflow */}
      {deletingWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15191F]/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm rounded-xl border border-[#15191F] bg-white p-6 shadow-2xl">
            <CornerMarks />
            <h3 className="font-bold text-base text-[#B23A2E] mb-2" style={display}>
              Confirm Delete Workflow
            </h3>
            <p className="text-xs text-[#74786F] mb-4">
              Are you sure you want to delete &quot;{deletingWf.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingWf(null)}
                className="rounded px-3 py-1.5 text-xs font-bold text-[#74786F]"
                style={mono}
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingWf.id)}
                className="rounded bg-[#B23A2E] px-3 py-1.5 text-xs font-bold text-white"
                style={mono}
              >
                DELETE WORKFLOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
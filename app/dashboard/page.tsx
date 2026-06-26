"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "../components/auth-provider";
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
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  nodes?: string;
  edges?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    borderColor: string;
    dotColor: string;
    textColor: string;
    bgColor: string;
    pulse?: boolean;
  }
> = {
  RUNNING: {
    label: "Running",
    borderColor: "#F59E0B",
    dotColor: "bg-amber-400",
    textColor: "text-amber-650",
    bgColor: "bg-amber-50",
    pulse: true,
  },
  COMPLETED: {
    label: "Completed",
    borderColor: "#10B981",
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-650",
    bgColor: "bg-emerald-50",
  },
  SUCCESS: {
    label: "Completed",
    borderColor: "#10B981",
    dotColor: "bg-emerald-400",
    textColor: "text-emerald-650",
    bgColor: "bg-emerald-50",
  },
  FAILED: {
    label: "Failed",
    borderColor: "#EF4444",
    dotColor: "bg-red-400",
    textColor: "text-red-650",
    bgColor: "bg-red-50",
  },
  IDLE: {
    label: "Idle",
    borderColor: "#D4D4D8",
    dotColor: "bg-zinc-300",
    textColor: "text-zinc-450",
    bgColor: "bg-zinc-100",
  },
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
  const [renamingWf, setRenamingWf] = useState<Workflow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingWf, setDeletingWf] = useState<Workflow | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "RUNNING" | "IDLE" | "SUCCESS" | "FAILED">("ALL");

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
        body: JSON.stringify({ name: newWorkflowName }),
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
        fetchWorkflows();
      }
    } catch (e) {
      console.error("Error deleting workflow:", e);
    }
  };

  // Filter workflows based on search query and active tab selection
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
                {i > 0 && (
                  <span className="text-zinc-300 text-[10px] select-none">→</span>
                )}
                <span className="text-[10px] px-2 py-0.5 bg-zinc-50 border border-zinc-100 text-zinc-500 rounded font-medium leading-tight">
                  {label}
                </span>
              </React.Fragment>
            );
          })}
          {overflow > 0 && (
            <>
              <span className="text-zinc-300 text-[10px] select-none">→</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-500 rounded font-bold border border-violet-100">
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
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F8F8F9] gap-3">
 
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        <p className="text-xs text-zinc-400 font-medium tracking-wide">
          Loading workspace…
        </p>
      </div>
    );
  }

  const welcomeName =
    user?.firstName ||
    user?.fullName ||
    user?.emailAddress?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-[#F8F8F9] text-zinc-900 flex flex-col font-sans antialiased">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-zinc-100 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-600/30">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-black text-base text-zinc-900 tracking-tight">
            Py
          </span>
          <span className="text-zinc-200 mx-1 select-none">·</span>
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-zinc-700 leading-tight">
              {welcomeName}
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight">
              {user?.emailAddress}
            </span>
          </div>
          <div className="h-5 w-px bg-zinc-100 hidden sm:block" />
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-6">
        {/* ── Page Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <div className="flex items-baseline gap-2.5 mb-1.5">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-none">
                Workflows
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[11px] font-bold leading-none">
                {totalCount}
              </span>
            </div>
            <p className="text-sm text-zinc-400 font-medium max-w-md leading-relaxed">
              Build and run LLM pipelines — connected, configurable, and
              monitored in one place.
            </p>
          </div>

          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-sm shadow-violet-600/25 cursor-pointer self-start shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            New Workflow
          </button>
        </div>

        {/* ── Toolbar & Tabs Card ────────────────────────────── */}
        <div className="flex flex-col gap-4 bg-white p-4 border border-zinc-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-350 pointer-events-none" />
              <input
                type="text"
                placeholder="Search workflows…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50/50 border border-zinc-300 rounded-xl text-sm text-zinc-800 placeholder-zinc-350 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-450 transition-all text-xs"
              />
            </div>
            <button
              onClick={fetchWorkflows}
              title="Refresh List"
              className="p-2 bg-white border border-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <span className="h-px bg-zinc-50 w-full" />

          {/* Underlined Vercel-Style Tabs */}
          <div className="flex gap-2 overflow-x-auto border-b border-zinc-100 scrollbar-none">
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
                  className={`relative pb-2.5 px-3 text-xs font-semibold cursor-pointer transition-all shrink-0 select-none ${
                    active ? "text-violet-650" : "text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-bold transition-all ${
                      active ? "bg-violet-50 text-violet-600" : "bg-zinc-50 text-zinc-500"
                    }`}>
                      {tab.count}
                    </span>
                  </div>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-650 rounded-t-full animate-in fade-in slide-in-from-bottom-1 duration-150" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Workflow Grid ───────────────────────────────────── */}
        {filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white border border-dashed border-zinc-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
              <Folder className="h-6 w-6 text-zinc-250" />
            </div>
            <h3 className="text-sm font-bold text-zinc-700 mb-1">
              {search ? "No results" : "No workflows yet"}
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
              {search
                ? `Nothing matched "${search}". Try a different name.`
                : "Create your first workflow to start building LLM automation pipelines."}
            </p>
            {!search && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                Create Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => {
              const sc = getStatusConfig(workflow.status);
              return (
                <div
                  key={workflow.id}
                  className="group flex flex-col bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                 
                >
                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col gap-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-zinc-900 text-sm truncate leading-snug group-hover:text-violet-600 transition-colors duration-150">
                          {workflow.name}
                        </h3>
                        <p className="text-[9px] text-zinc-350 font-mono mt-0.5 truncate">
                          {workflow.id}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${sc.textColor} ${sc.bgColor}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${sc.dotColor} ${sc.pulse ? "animate-pulse" : ""}`}
                        />
                        {sc.label}
                      </span>
                    </div>

                    {/* Pipeline preview */}
                    {workflow.nodes && renderPipelinePreview(workflow.nodes)}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-2.5 border-t border-zinc-50 bg-[#FAFAFA] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(workflow.updatedAt)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRenamingWf(workflow);
                          setRenameValue(workflow.name);
                        }}
                        title="Rename"
                        className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-650 hover:bg-zinc-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingWf(workflow)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => router.push(`/canvas/${workflow.id}`)}
                        className="flex items-center gap-1 ml-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create Modal ───────────────────────────────────── */}
      {creating && (
        <Modal title="New Workflow" subtitle="Give your pipeline a name." onClose={() => setCreating(false)}>
          <form onSubmit={handleCreateWorkflow} className="space-y-4">
            <ModalField label="Workflow Name">
              <input
                type="text"
                required
                placeholder="e.g., Lead Enrichment Pipeline"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                className={modalInputClass}
                autoFocus
              />
            </ModalField>
            <ModalActions
              onCancel={() => setCreating(false)}
              confirmLabel="Create & Open"
            />
          </form>
        </Modal>
      )}

      {/* ── Rename Modal ───────────────────────────────────── */}
      {renamingWf && (
        <Modal title="Rename Workflow" subtitle="Update this pipeline's name." onClose={() => setRenamingWf(null)}>
          <form onSubmit={handleRename} className="space-y-4">
            <ModalField label="New Name">
              <input
                type="text"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className={modalInputClass}
                autoFocus
              />
            </ModalField>
            <ModalActions
              onCancel={() => setRenamingWf(null)}
              confirmLabel="Save Changes"
            />
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ────────────────────── */}
      {deletingWf && (
        <Modal
          title="Delete Workflow"
          subtitle="This action is permanent and cannot be undone."
          onClose={() => setDeletingWf(null)}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-750 leading-relaxed font-medium">
                Are you sure you want to delete <strong>{deletingWf.name}</strong>? All executions, history, and outputs associated with this workflow will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingWf(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 border border-zinc-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = deletingWf.id;
                  setDeletingWf(null);
                  handleDeleteConfirm(id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-sm shadow-red-650/20"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Shared modal primitives ───────────────────────────────── */
const modalInputClass =
  "w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-350 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 text-sm transition-all";

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-zinc-100">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-300 hover:text-zinc-650 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer -mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[9px] font-bold text-zinc-400 mb-1.5 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalActions({
  onCancel,
  confirmLabel,
}: {
  onCancel: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 border border-zinc-200 transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all cursor-pointer shadow-sm shadow-violet-600/20"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
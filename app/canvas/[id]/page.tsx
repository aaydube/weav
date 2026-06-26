"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ReactFlow, ReactFlowProvider, Controls, Background, useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "../../lib/canvas-store";
import { nodeTypes } from "../../components/custom-nodes";
import { UserButton, useUser } from "../../components/auth-provider";
import {
  ArrowLeft,
  Play,
  BrainCircuit,
  Image as ImageIcon,
  History,
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  CloudLightning,
  Cloud,
  Loader2,
  Trash2,
  PanelLeft,
  Database,
  Wallet,
  Download,
  Upload
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  status: string;
  runs: any[];
}

function CanvasContent({ id }: { id: string }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { screenToFlowPosition } = useReactFlow();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user?.id, router]);

  // Zustand bindings
  const {
    nodes,
    edges,
    selectedNodeId,
    isRunning,
    executingNodes,
    runHistory,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    updateNodeData,
    setIsRunning,
    setExecutingNodes,
    updateExecutingNode,
    setRunHistory,
    resetExecutionStates
  } = useCanvasStore();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<"ui" | "api">("ui");
  const [historyFilter, setHistoryFilter] = useState<"all" | "running" | "completed" | "canceled">("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Controls hidden sidebar
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch Workflow Config on mount
  useEffect(() => {
    const fetchWf = async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`);
        if (res.ok) {
          const data = await res.json();
          setWorkflow(data);
          
          // Populate Zustand
          const parsedNodes = data.nodes ? JSON.parse(data.nodes) : [];
          const parsedEdges = data.edges ? JSON.parse(data.edges) : [];
          setNodes(parsedNodes);
          setEdges(parsedEdges);
          setRunHistory(data.runs || []);
        }
      } catch (e) {
        console.error("Error loading workflow:", e);
      }
    };
    fetchWf();
  }, [id]);

  // Debounced auto-save canvas on node/edge changes (skips during active runs)
  useEffect(() => {
    if (!workflow) return;
    if (isRunning) return; // Don't auto-save mid-run — outputs would overwrite blank state

    setSaveStatus("saving");
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: JSON.stringify(nodes),
            edges: JSON.stringify(edges),
          }),
        });
        if (res.ok) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch (e) {
        setSaveStatus("error");
        console.error("Failed to save workflow:", e);
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [nodes, edges, isRunning]);

  // Run Workflow execution handler
  const handleRunWorkflow = async () => {
    if (isRunning) return;

    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);

    try {
      setIsRunning(true);
      resetExecutionStates();
      
      const res = await fetch(`/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nodes, 
          edges
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPollingRunId(data.runId);
      } else {
        setIsRunning(false);
        alert("Failed to start run");
      }
    } catch (e) {
      setIsRunning(false);
      console.error(e);
    }
  };

  // Cancel Workflow execution handler
  const handleCancelWorkflow = async () => {
    // Optimistically clear all running state immediately so the UI
    // always responds — even if the API call is slow or fails.
    const runIdToCancel = pollingRunId;
    setPollingRunId(null);
    setIsRunning(false);
    resetExecutionStates();

    if (!runIdToCancel) return;

    try {
      const res = await fetch(`/api/workflows/${id}/runs/${runIdToCancel}`, {
        method: "POST",
      });
      // Refresh run history regardless of success/failure
      const historyRes = await fetch(`/api/workflows/${id}`);
      if (historyRes.ok) {
        const updatedWf = await historyRes.json();
        setRunHistory(updatedWf.runs || []);
      }
      if (!res.ok) {
        console.warn("Cancel API returned non-OK, but local state was already cleared.");
      }
    } catch (e) {
      console.error("Cancel error:", e);
    }
  };

  // Poll Run Status
  useEffect(() => {
    if (!pollingRunId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/workflows/${id}/runs/${pollingRunId}`);
        if (res.ok) {
          const run = await res.json();

          // Always apply live log updates to nodes
          const applyLogs = (logs: string) => {
            try {
              const nodeLogs = JSON.parse(logs);
              const liveStates: Record<string, "idle" | "running" | "success" | "failed"> = {};
              Object.entries(nodeLogs).forEach(([nodeId, state]: [string, any]) => {
                liveStates[nodeId] = state.status;
                if (state.status === "success" && state.output) {
                  updateNodeData(nodeId, state.output);
                }
              });
              setExecutingNodes(liveStates);
            } catch (e) {
              console.error("Failed to parse run logs:", e);
            }
          };

          if (run.logs) {
            applyLogs(run.logs);
          }

          if (run.status !== "RUNNING") {
            // Run is done — do one final definitive fetch of the completed run
            // to guarantee we apply the full final state to nodes
            try {
              const finalRes = await fetch(`/api/workflows/${id}/runs/${pollingRunId}`);
              if (finalRes.ok) {
                const finalRun = await finalRes.json();
                if (finalRun.logs) {
                  applyLogs(finalRun.logs);
                }
              }
            } catch (_) {}

            setPollingRunId(null);
            setIsRunning(false);

            const historyRes = await fetch(`/api/workflows/${id}`);
            if (historyRes.ok) {
              const updatedWf = await historyRes.json();
              setRunHistory(updatedWf.runs || []);
            }
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [pollingRunId, updateNodeData]);

  const onNodeClick = (_: any, node: any) => {
    setSelectedNodeId(node.id);
    setIsSidebarOpen(true); // Open settings sidebar when a node is clicked
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const addCropImageNode = () => {
    const id = "crop_" + Math.random().toString(36).substring(2, 9);
    const newNode = {
      id,
      type: "cropImage",
      position: { x: 300, y: 200 },
      data: {
        title: "Crop Image",
        aspectRatio: "1:1",
        cropType: "tight",
        croppedImage: null,
        cropped_image: null,
      },
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
  };

  const addGeminiNode = () => {
    const id = "gemini_" + Math.random().toString(36).substring(2, 9);
    const newNode = {
      id,
      type: "geminiPro",
      position: { x: 300, y: 350 },
      data: {
        title: "Gemini 3.1 Pro",
        prompt: "",
        model: "gemini-2.5-flash",
        temperature: 0.7,
        textOutput: "",
      },
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node?.type === "requestInputs" || node?.type === "responseNode") {
      alert("Core workflow entry/exit nodes cannot be deleted!");
      return;
    }

    setNodes(nodes.filter((n) => n.id !== selectedNodeId));
    setEdges(edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // ── JSON Export ──────────────────────────────────────────────
  const handleExport = () => {
    const payload = {
      name: workflow?.name || "workflow",
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(workflow?.name || "workflow").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── JSON Import ──────────────────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        alert("Invalid workflow JSON: must contain \"nodes\" and \"edges\" arrays.");
        return;
      }
      // Load into canvas
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      // Persist to server
      await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: JSON.stringify(parsed.nodes),
          edges: JSON.stringify(parsed.edges),
          ...(parsed.name ? { name: parsed.name } : {}),
        }),
      });
    } catch (err) {
      alert("Failed to parse JSON file. Make sure it is a valid workflow export.");
    } finally {
      // Reset so the same file can be re-imported if needed
      e.target.value = "";
    }
  };

  const getRunStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS": return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "FAILED": return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case "RUNNING": return <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getRunStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS": return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "FAILED": return "text-rose-700 bg-rose-5 border-rose-200";
      case "RUNNING": return "text-amber-700 bg-amber-50 border-amber-200";
      default: return "text-zinc-650 bg-zinc-100 border-zinc-200";
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!isLoaded || !user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#FAFAFA] text-zinc-655">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600 mb-4" />
        <p className="text-sm font-semibold tracking-wide">Loading canvas...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen bg-[#FAFAFA] text-zinc-800 overflow-hidden font-sans">
      
      {/* 4. Collapsible Left Sidebar - Node Drawer + Config (z-30) */}
      <aside 
        className={`h-full bg-white border-r border-zinc-200 shadow-xl z-30 transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'}`}
      >
        <div className="w-80 h-full flex flex-col">
          <div className="p-4 border-b border-zinc-200 flex items-center bg-zinc-50/50 pt-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-800 tracking-tight">Configuration Panel</h2>
              <p className="text-[10px] text-zinc-400 mt-0.5">Add nodes & edit properties</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider mb-1">Add Dynamic Nodes</h3>
              <button
                onClick={addCropImageNode}
                className="flex items-center gap-3 w-full p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/40 transition-all text-left group cursor-pointer shadow-sm/5"
              >
                <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-600 group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-zinc-700 group-hover:text-zinc-900">Crop Image Node</span>
                  <span className="text-[10px] text-zinc-450">Crops image via Trigger.dev + FFmpeg</span>
                </div>
              </button>

              <button
                onClick={addGeminiNode}
                className="flex items-center gap-3 w-full p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/40 transition-all text-left group cursor-pointer shadow-sm/5"
              >
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-650 group-hover:scale-105 transition-transform">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block text-zinc-700 group-hover:text-zinc-900">Gemini 3.1 Pro Node</span>
                  <span className="text-[10px] text-zinc-450">Google Gemini LLM executor</span>
                </div>
              </button>
            </div>

            {/* Parameters configuration */}
            {selectedNode ? (
              <div className="flex flex-col gap-3.5 pt-6 border-t border-zinc-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Node settings</h3>
                  {selectedNode.type !== "requestInputs" && selectedNode.type !== "responseNode" && (
                    <button
                      onClick={deleteSelectedNode}
                      className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-650 rounded transition-colors cursor-pointer"
                      title="Delete Node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-semibold">Node Name</label>
                  <input
                    type="text"
                    value={selectedNode.data.title as string || ""}
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-750 focus:outline-none"
                  />
                </div>

                {selectedNode.type === "cropImage" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-400 uppercase font-semibold">Crop Aspect Ratio</label>
                      <select
                        value={selectedNode.data.aspectRatio as string || "1:1"}
                        onChange={(e) => updateNodeData(selectedNode.id, { aspectRatio: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-750 focus:outline-none cursor-pointer"
                      >
                        <option value="1:1">1:1 Square (Tight)</option>
                        <option value="16:9">16:9 Banner (Wide)</option>
                        <option value="4:3">4:3 Standard</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === "geminiPro" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-400 uppercase font-semibold">LLM Model</label>
                      <select
                        value={selectedNode.data.model as string || "gemini-2.5-flash"}
                        onChange={(e) => updateNodeData(selectedNode.id, { model: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-750 focus:outline-none cursor-pointer"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-zinc-400 uppercase font-semibold">Prompt Template</label>
                      <textarea
                        value={selectedNode.data.prompt as string || ""}
                        onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                        className="w-full min-h-[140px] px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-750 focus:outline-none font-mono text-[10.5px] leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl flex-1 max-h-[160px] mt-6 bg-zinc-50/20">
                <FolderOpen className="h-6 w-6 text-zinc-300 mb-2" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Select a node</span>
                <span className="text-[9px] text-zinc-450 mt-0.5">Click any node on the canvas to configure settings.</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <div className="relative flex-1 h-full z-0 overflow-hidden">
        {/* 1. Top-Left Controls — sidebar toggle + workflow name tab */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2 max-w-[calc(50%-1rem)]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-600 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl bg-white border border-zinc-200 px-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-zinc-800 truncate min-w-0">
              {workflow?.name || "New Workflow"}
            </span>
            {saveStatus === "saving" && <CloudLightning className="flex-shrink-0 h-3.5 w-3.5 text-zinc-400 animate-pulse" />}
            {saveStatus === "saved" && <Cloud className="flex-shrink-0 h-3.5 w-3.5 text-zinc-300" />}
          </div>
        </div>

        {/* 2. Floating Top-Right UI (Screenshot matched) */}
        <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            {/* Status Pills */}
            <div className="flex h-9 items-center gap-2 rounded-lg bg-white border border-zinc-200 px-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-xs text-zinc-600 font-medium tracking-wide">
            
              Viewing live run <span className="font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{id}</span>
            </div>
            <div className="flex h-9 items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-xs text-zinc-600 font-medium">
              <Database className="h-3.5 w-3.5 text-zinc-400" /> Est 0.01 M
            </div>
            <div className="flex h-9 items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-xs text-zinc-600 font-medium">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" /> Bal 30.34 M
            </div>
            
            {/* Profile & Controls */}
            <div className="flex h-9 items-center justify-center rounded-lg bg-[#E2DEF8] border border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-1.5 min-w-[36px]">
              <UserButton />
            </div>
            
            {/* Top Run Button */}
           <button
  onClick={handleRunWorkflow}
  disabled={isRunning}
  className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 border border-violet-700 text-white hover:bg-violet-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  title="Run workflow"
>
  {isRunning ? (
    <Loader2 className="h-4 w-4 animate-spin text-white" />
  ) : (
    <Play className="h-4 w-4 fill-white text-white" />
  )}
</button>

            {/* Cancel Button (Visible only when running) */}
            {isRunning && (
              <button 
                onClick={handleCancelWorkflow}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-rose-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                title="Cancel execution"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            <button 
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
              title="Run history"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={handleExport}
              title="Export workflow as JSON"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              title="Import workflow from JSON"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
            </button>
            {/* Hidden file input for JSON import */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

        </div>

        {/* 3. React Flow Canvas (Base Layer) */}
        <div className="absolute inset-0 z-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            className="bg-[#FAFAFA]"
            colorMode="light"
          >
            <Controls className="!bg-white !border-zinc-200 !rounded-xl !shadow-sm !mb-6 !ml-4" showInteractive={false} />
            <Background color="#E4E4E7" gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* 5. Right Sidebar - Execution History Drawer */}
      <aside
        className={`h-full bg-white border-l border-zinc-200 shadow-2xl z-30 transition-all duration-300 flex flex-col ${
          historyOpen ? 'w-[300px]' : 'w-0 overflow-hidden border-l-0'
        }`}
      >
        <div className="w-[300px] h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <span className="text-[13.5px] font-bold text-zinc-800 tracking-tight">Execution History</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-[12px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mx-4 mt-3 mb-3 bg-zinc-100 rounded-[10px] p-1">
            <button
              onClick={() => setHistoryTab("ui")}
              className={`flex-1 text-[12px] font-semibold py-1.5 rounded-[8px] transition-all cursor-pointer ${
                historyTab === "ui"
                  ? "bg-white text-zinc-800 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              UI Runs
            </button>
            <button
              onClick={() => setHistoryTab("api")}
              className={`flex-1 text-[12px] font-semibold py-1.5 rounded-[8px] transition-all cursor-pointer ${
                historyTab === "api"
                  ? "bg-white text-zinc-800 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              API Runs
            </button>
          </div>

          {/* Filter row */}
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-[12px] font-semibold text-zinc-500">Run history</span>
            <div className="relative">
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
                className="text-[11.5px] font-semibold text-zinc-700 bg-transparent border-0 outline-none cursor-pointer appearance-none pr-4 py-0.5"
              >
                <option value="all">All</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">▾</span>
            </div>
          </div>

          {/* Run cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2">
            {(() => {
              const filtered = (historyTab === "api" ? [] : runHistory).filter((run) => {
                if (historyFilter === "all") return true;
                const s = run.status?.toLowerCase();
                if (historyFilter === "running") return s === "running";
                if (historyFilter === "completed") return s === "success" || s === "completed";
                if (historyFilter === "canceled") return s === "canceled" || s === "cancelled" || s === "partial";
                return true;
              });

              if (historyTab === "api") {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 text-center text-zinc-400 py-10">
                    <Clock className="h-6 w-6 text-zinc-300 mb-2" />
                    <span className="text-[11px] font-semibold">No API runs yet</span>
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 text-center text-zinc-400 py-10 border border-dashed border-zinc-200 rounded-2xl mx-1">
                    <Clock className="h-6 w-6 text-zinc-300 mb-2" />
                    <span className="text-[11px] font-bold tracking-wide">No runs yet</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Click &#39;New run&#39; to start.</span>
                  </div>
                );
              }

              return filtered.map((run) => {
                const status = run.status?.toLowerCase();
                const isRunning = status === "running";
                const isCompleted = status === "success" || status === "completed";
                const isCanceled = status === "canceled" || status === "cancelled" || status === "partial";

                const dotColor = isRunning
                  ? "bg-blue-500"
                  : isCompleted
                  ? "bg-emerald-500"
                  : isCanceled
                  ? "bg-zinc-400"
                  : "bg-rose-500";

                const statusLabel = isRunning
                  ? "Running"
                  : isCompleted
                  ? "Completed"
                  : isCanceled
                  ? "Canceled"
                  : run.status;

                const creditsM = run.duration
                  ? (run.duration / 1000 / 100).toFixed(2)
                  : "0";

                const formattedDate = (() => {
                  try {
                    const d = new Date(run.createdAt);
                    return d.toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    }).replace(",", ",");
                  } catch { return run.createdAt; }
                })();

                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={`px-3.5 py-3 rounded-[12px] cursor-pointer transition-all border ${
                      isRunning
                        ? "border-blue-400 bg-white shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isRunning ? dotColor + " animate-pulse" : dotColor
                        }`} />
                        <span className="text-[12.5px] font-semibold text-zinc-800">{statusLabel}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium">{formattedDate}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 ml-4">Credits: {creditsM}M</p>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </aside>

      {/* 6. Node Logs Details Side Drawer Modal */}
      {selectedRun && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-end bg-zinc-900/40 backdrop-blur-sm"
          onClick={() => setSelectedRun(null)}
        >
          <div
            className="w-full max-w-lg h-full bg-white border-l border-zinc-200 p-6 flex flex-col gap-5 shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-800 tracking-tight">Run Details</h3>
                <p className="text-[10px] font-mono text-zinc-400 mt-1">ID: {selectedRun.id}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 text-zinc-450 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-xl shadow-sm/5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">Status</span>
                <span className={`text-xs px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${getRunStatusColor(selectedRun.status)}`}>
                  {getRunStatusIcon(selectedRun.status)}
                  {selectedRun.status}
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-200"></div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">Created At</span>
                <span className="text-xs text-zinc-750 font-bold">
                  {new Date(selectedRun.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-200"></div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">Execution Time</span>
                <span className="text-xs text-zinc-750 font-bold">
                  {(selectedRun.duration / 1000).toFixed(2)}s
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Node execution trace</h4>
              {selectedRun.logs ? (() => {
                const logEntries = Object.entries(JSON.parse(selectedRun.logs));
                const responseEntry = logEntries.find(([nodeId]) => {
                  const nodeObj = nodes.find((n) => n.id === nodeId);
                  return nodeObj?.type === "responseNode";
                });
                const traceEntries = logEntries.filter(([nodeId]) => {
                  const nodeObj = nodes.find((n) => n.id === nodeId);
                  return nodeObj?.type !== "responseNode";
                });

                return (
                  <>
                    {traceEntries.map(([nodeId, state]: [string, any]) => {
                  const nodeObj = nodes.find((n) => n.id === nodeId);
                  const nodeName = nodeObj?.data?.title as string || nodeId;
                  const nodeTypeLabel = nodeObj?.type || "unknown";

                  return (
                    <div
                      key={nodeId}
                      className="p-4 border border-zinc-200 bg-zinc-50/30 rounded-xl flex flex-col gap-2.5 hover:border-zinc-250 transition-colors shadow-sm/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-750">{nodeName}</span>
                          <span className="text-[8px] px-1.5 py-0.5 bg-zinc-100 border border-zinc-200/80 text-zinc-500 rounded uppercase font-bold">
                            {nodeTypeLabel}
                          </span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${getRunStatusColor(state.status)}`}>
                          {getRunStatusIcon(state.status)}
                          {state.status}
                        </span>
                      </div>

                      {state.duration && (
                        <div className="text-[9px] text-zinc-450 flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3" /> Done in {(state.duration / 1000).toFixed(2)}s
                        </div>
                      )}

                      {/* Display Outputs — type-aware */}
                      {state.output && (() => {
                        const hasAnyOutput =
                          state.output.error ||
                          state.output.product_text ||
                          state.output.product_photo ||
                          state.output.cropped_image ||
                          state.output.output;
                        if (!hasAnyOutput) return null;

                        return (
                          <div className="mt-1 pt-2 border-t border-zinc-150/65 flex flex-col gap-2.5">
                            {/* Error */}
                            {state.output.error && (
                              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-lg font-mono leading-relaxed">
                                {state.output.error}
                              </div>
                            )}

                            {/* Request Inputs: product text */}
                            {state.output.product_text && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-zinc-450 uppercase">Product Text</span>
                                <div className="text-[11px] leading-relaxed text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                                  {state.output.product_text}
                                </div>
                              </div>
                            )}

                            {/* Request Inputs: product photo */}
                            {state.output.product_photo && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-zinc-450 uppercase">Product Photo</span>
                                <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 w-full aspect-video shadow-sm">
                                  <img src={state.output.product_photo} className="w-full h-full object-cover" alt="Product" />
                                </div>
                              </div>
                            )}

                            {/* Crop Image: cropped output */}
                            {state.output.cropped_image && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-zinc-450 uppercase">Cropped Output</span>
                                <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50 w-full shadow-sm">
                                  <img src={state.output.cropped_image} className="w-full object-cover max-h-40" alt="Cropped" />
                                </div>
                              </div>
                            )}

                            {/* Gemini: AI text output */}
                            {state.output.output && (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-zinc-450 uppercase">AI Response</span>
                                <div className="text-[11px] leading-relaxed text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 max-h-[160px] overflow-y-auto space-y-1">
                                  {(state.output.output as string)
                                    .split('\n')
                                    .filter((l: string) => l.trim() !== '')
                                    .map((l: string, li: number) => {
                                      if (/^#{1,2}\s/.test(l)) {
                                        return <p key={li} className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 pt-1">{l.replace(/^#{1,2}\s/, '')}</p>;
                                      }
                                      const parts = l.split(/(\*\*[^*]+\*\*)/g);
                                      return (
                                        <p key={li} className={l.startsWith('•') || l.startsWith('-') ? 'pl-2' : ''}>
                                          {parts.map((part: string, pi: number) =>
                                            /^\*\*(.+)\*\*$/.test(part)
                                              ? <span key={pi} className="font-semibold text-zinc-800">{part.replace(/\*\*/g, '')}</span>
                                              : <span key={pi}>{part}</span>
                                          )}
                                        </p>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                    })}

                    {/* Final Output Card — Response node summary */}
                    {responseEntry && (() => {
                      const [, respState] = responseEntry as [string, any];
                      if (!respState?.output) return null;
                      const { text, image_1, image_2 } = respState.output;
                      if (!text && !image_1 && !image_2) return null;
                      return (
                        <div className="p-4 border border-emerald-200 bg-emerald-50/40 rounded-xl flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Final Output</span>
                          </div>
                          {text && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-450 uppercase">Marketing Copy</span>
                              <div className="text-[11px] leading-relaxed text-zinc-700 bg-white border border-zinc-200 rounded-lg p-2.5 max-h-[160px] overflow-y-auto space-y-1">
                                {(text as string)
                                  .split('\n')
                                  .filter((l: string) => l.trim() !== '')
                                  .map((l: string, li: number) => {
                                    if (/^#{1,2}\s/.test(l)) {
                                      return <p key={li} className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 pt-1">{l.replace(/^#{1,2}\s/, '')}</p>;
                                    }
                                    const parts = l.split(/(\*\*[^*]+\*\*)/g);
                                    return (
                                      <p key={li} className={l.startsWith('•') || l.startsWith('-') ? 'pl-2' : ''}>
                                        {parts.map((part: string, pi: number) =>
                                          /^\*\*(.+)\*\*$/.test(part)
                                            ? <span key={pi} className="font-semibold text-zinc-800">{part.replace(/\*\*/g, '')}</span>
                                            : <span key={pi}>{part}</span>
                                        )}
                                      </p>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          {(image_1 || image_2) && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-zinc-450 uppercase">Image Assets</span>
                              <div className="grid grid-cols-2 gap-2">
                                {image_1 && (
                                  <div>
                                    <span className="text-[8px] font-semibold text-zinc-500 uppercase block mb-1">Tight (1:1)</span>
                                    <img src={image_1} className="rounded border border-zinc-200 aspect-square object-cover w-full" alt="Tight crop" />
                                  </div>
                                )}
                                {image_2 && (
                                  <div>
                                    <span className="text-[8px] font-semibold text-zinc-500 uppercase block mb-1">Wide (16:9)</span>
                                    <img src={image_2} className="rounded border border-zinc-200 aspect-square object-cover w-full" alt="Wide crop" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })() : (
                <div className="text-xs text-zinc-450 italic">No node traces available for this run.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <ReactFlowProvider>
      <CanvasContent id={resolvedParams.id} />
    </ReactFlowProvider>
  );
}
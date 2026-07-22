"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReactFlow, ReactFlowProvider, Controls, Background, MiniMap, Panel, useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "../../lib/canvas-store";
import { nodeTypes } from "../../components/custom-nodes";
import { UserButton, useUser } from "../../components/auth-provider";
import { WeavMark } from "../../components/weav-mark";
import {
  INK,
  SIGNAL,
  CIRCUIT,
  GRAPHITE,
  LINE,
  PAPER,
  SUCCESS,
  FAILED,
  AUX,
  display,
  mono,
  alpha,
  WeavStyles,
  CornerMarks,
  StatusChip,
  LogoChip,
  MonoLabel,
} from "../../components/weav-theme";
import {
  ArrowLeft,
  Play,
  BrainCircuit,
  Image as ImageIcon,
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
  Download,
  Upload,
  Info,
  Copy,
  Check,
  Maximize2,
  Sliders,
  Terminal,
  Grid,
  Search,
  Sparkles,
  Zap,
  Plus,
  RefreshCw,
  Edit2,
  Code,
  Activity,
  Layers,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  status: string;
  runs: any[];
}

type ToastTone = "info" | "success" | "error";
interface ToastMsg {
  id: number;
  tone: ToastTone;
  message: string;
}

function getStatusTone(status: string): { color: string; bg: string; border: string } {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      return { color: SUCCESS, bg: alpha(SUCCESS, 0.08), border: alpha(SUCCESS, 0.3) };
    case "FAILED":
      return { color: FAILED, bg: alpha(FAILED, 0.06), border: alpha(FAILED, 0.3) };
    case "RUNNING":
      return { color: SIGNAL, bg: alpha(SIGNAL, 0.08), border: alpha(SIGNAL, 0.3) };
    default:
      return { color: GRAPHITE, bg: "#F4F4F1", border: LINE };
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#F2F4EF] hover:bg-[#DBDED4] text-[#15191F] transition-colors cursor-pointer"
      style={mono}
    >
      {copied ? <Check className="h-3 w-3 text-[#1F8A6B]" /> : <Copy className="h-3 w-3 text-[#74786F]" />}
      <span>{copied ? "COPIED" : "COPY JSON"}</span>
    </button>
  );
}

function CanvasContent({ id }: { id: string }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Zustand state
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
    resetExecutionStates,
  } = useCanvasStore();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogTerminalOpen, setIsLogTerminalOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"config" | "payload" | "telemetry" | "json">("config");
  const [gridMode, setGridMode] = useState<"light" | "dark">("light");
  const [searchPalette, setSearchPalette] = useState("");
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const importInputRef = useRef<HTMLInputElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  const pushToast = (message: string, tone: ToastTone = "info") => {
    const toastId = ++toastIdRef.current;
    setToasts((t) => [...t, { id: toastId, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toastId)), 4000);
  };

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user?.id, router]);

  // Load Workflow on Mount
  useEffect(() => {
    const fetchWf = async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`);
        if (res.ok) {
          const data = await res.json();
          setWorkflow(data);
          setWorkflowTitle(data.name || "Untitled Workflow");

          const parsedNodes = data.nodes ? JSON.parse(data.nodes) : [];
          const parsedEdges = data.edges ? JSON.parse(data.edges) : [];
          setNodes(parsedNodes);
          setEdges(parsedEdges);
          setRunHistory(data.runs || []);
        } else {
          pushToast("Couldn't load workflow configuration.", "error");
        }
      } catch (e) {
        console.error("Error loading workflow:", e);
        pushToast("Network error loading workflow.", "error");
      }
    };
    fetchWf();
  }, [id]);

  // Save Workflow
  const saveWorkflow = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowTitle,
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch (e) {
      console.error("Failed to save workflow:", e);
      setSaveStatus("error");
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!workflow || isRunning) return;
    setSaveStatus("saving");
    const t = setTimeout(saveWorkflow, 1200);
    return () => clearTimeout(t);
  }, [nodes, edges, workflowTitle, isRunning]);

  // Execute Workflow
  const handleRunWorkflow = async () => {
    if (isRunning) return;
    try {
      setIsRunning(true);
      resetExecutionStates();

      const res = await fetch(`/api/workflows/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });

      if (res.ok) {
        const data = await res.json();
        setPollingRunId(data.runId);
        pushToast("Workflow execution initiated.", "info");
      } else {
        setIsRunning(false);
        pushToast("Failed to start workflow execution.", "error");
      }
    } catch (e) {
      setIsRunning(false);
      pushToast("Network error executing workflow.", "error");
    }
  };

  // Poll Execution Status
  useEffect(() => {
    if (!pollingRunId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/workflows/${id}/runs/${pollingRunId}`);
        if (res.ok) {
          const run = await res.json();
          if (run.logs) {
            try {
              const nodeLogs = JSON.parse(run.logs);
              const liveStates: Record<string, "idle" | "running" | "success" | "failed"> = {};
              Object.entries(nodeLogs).forEach(([nodeId, state]: [string, any]) => {
                liveStates[nodeId] = state.status;
                if (state.status === "success" && state.output) {
                  updateNodeData(nodeId, state.output);
                }
              });
              setExecutingNodes(liveStates);
            } catch (e) {
              console.error(e);
            }
          }

          if (run.status !== "RUNNING") {
            setPollingRunId(null);
            setIsRunning(false);
            if (run.status === "FAILED") {
              pushToast("Execution failed. Inspect telemetry logs.", "error");
            } else {
              pushToast("Workflow execution completed successfully!", "success");
            }

            const historyRes = await fetch(`/api/workflows/${id}`);
            if (historyRes.ok) {
              const updatedWf = await historyRes.json();
              setRunHistory(updatedWf.runs || []);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [pollingRunId]);

  // DAG Auto-Layout Handler
  const handleAutoLayout = () => {
    const horizontalGap = 320;
    const verticalGap = 160;

    const updatedNodes = nodes.map((node, index) => {
      let x = 100 + index * horizontalGap;
      let y = 180 + (index % 2 === 0 ? 0 : verticalGap);

      if (node.type === "requestInputs") {
        x = 80;
        y = 200;
      } else if (node.type === "cropImage") {
        x = 440;
        y = 80;
      } else if (node.type === "geminiPro") {
        x = 440;
        y = 320;
      } else if (node.type === "responseNode") {
        x = 840;
        y = 200;
      }

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(updatedNodes);
    setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 50);
    pushToast("Canvas nodes arranged automatically.", "info");
  };

  // Node Spawn Placement
  const spawnNode = (type: string, defaultData: any) => {
    const bounds = canvasWrapperRef.current?.getBoundingClientRect();
    const center = bounds
      ? screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
      : { x: 300, y: 200 };

    const count = nodes.filter((n) => n.type === type).length;
    const offset = (count % 5) * 30;

    const newNodeId = `${type}_${Math.random().toString(36).substring(2, 9)}`;
    const newNode = {
      id: newNodeId,
      type,
      position: { x: center.x - 100 + offset, y: center.y - 60 + offset },
      data: defaultData,
    };

    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNodeId);
    pushToast(`Added ${defaultData.title || type} node.`, "info");
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Export JSON
  const handleExportJSON = () => {
    const spec = JSON.stringify({ name: workflowTitle, nodes, edges }, null, 2);
    const blob = new Blob([spec], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowTitle.toLowerCase().replace(/\s+/g, "_")}_spec.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Exported workflow JSON specification.", "success");
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const spec = JSON.parse(event.target?.result as string);
        if (spec.nodes && Array.isArray(spec.nodes)) {
          setNodes(spec.nodes);
          if (spec.edges && Array.isArray(spec.edges)) setEdges(spec.edges);
          if (spec.name) setWorkflowTitle(spec.name);
          pushToast("Successfully imported workflow JSON.", "success");
        }
      } catch {
        pushToast("Invalid workflow JSON file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!isLoaded || !user || !workflow) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F2F4EF] gap-3">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: SIGNAL }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
          LOADING SCHEMATIC CANVAS…
        </span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F2F4EF] text-[#15191F] overflow-hidden selection:bg-[#EA5A2B] selection:text-white">
      <WeavStyles />

      {/* Hidden file picker for JSON import */}
      <input type="file" ref={importInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />

      {/* ── Top Header Navigation Bar ────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-[#DBDED4] px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-md hover:bg-[#F2F4EF] transition-colors text-[#74786F] hover:text-[#15191F]"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <LogoChip size="h-7 w-7">
            <WeavMark className="w-4 h-4 text-[#EA5A2B]" />
          </LogoChip>

          <div className="h-4 w-px bg-[#DBDED4]" />

          {/* Editable Title */}
          {editingTitle ? (
            <input
              type="text"
              autoFocus
              value={workflowTitle}
              onChange={(e) => setWorkflowTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="bg-[#F2F4EF] border border-[#EA5A2B] rounded px-2 py-1 text-xs font-bold focus:outline-none"
              style={display}
            />
          ) : (
            <div
              onClick={() => setEditingTitle(true)}
              className="group flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-[#F2F4EF] transition-colors"
            >
              <h1 className="font-bold text-sm text-[#15191F]" style={display}>
                {workflowTitle}
              </h1>
              <Edit2 className="h-3 w-3 text-[#74786F] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Save Status Badge */}
          <StatusChip
            label={saveStatus === "saving" ? "SAVING..." : saveStatus === "saved" ? "SAVED" : "SAVE ERROR"}
            color={saveStatus === "saving" ? SIGNAL : saveStatus === "saved" ? SUCCESS : FAILED}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Auto Layout Button */}
          <button
            onClick={handleAutoLayout}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DBDED4] bg-white hover:bg-[#F2F4EF] text-xs font-bold transition-all text-[#15191F] cursor-pointer"
            style={mono}
            title="Arrange nodes automatically"
          >
            <Layers className="h-3.5 w-3.5 text-[#33608A]" />
            <span>AUTO LAYOUT</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DBDED4] bg-white hover:bg-[#F2F4EF] text-xs font-bold transition-all text-[#15191F] cursor-pointer"
            style={mono}
            title="Export Spec JSON"
          >
            <Download className="h-3.5 w-3.5 text-[#74786F]" />
            <span>EXPORT</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => importInputRef.current?.click()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#DBDED4] bg-white hover:bg-[#F2F4EF] text-xs font-bold transition-all text-[#15191F] cursor-pointer"
            style={mono}
            title="Import Spec JSON"
          >
            <Upload className="h-3.5 w-3.5 text-[#74786F]" />
            <span>IMPORT</span>
          </button>

          {/* Primary RUN Button */}
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
              isRunning ? "bg-[#EA5A2B] animate-pulse cursor-not-allowed" : "bg-[#15191F] hover:bg-[#EA5A2B] hover:scale-102"
            }`}
            style={mono}
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 text-[#EA5A2B]" />}
            <span>{isRunning ? "RUNNING PIPELINE..." : "RUN PIPELINE"}</span>
          </button>

          <div className="h-4 w-px bg-[#DBDED4]" />

          <UserButton />
        </div>
      </header>

      {/* ── Main Canvas Viewport & Sidebars ──────────────────────── */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* ── Left Node Palette Sidebar ──────────────────────────── */}
        <aside
          className={`z-30 w-72 bg-white border-r border-[#DBDED4] flex flex-col transition-all duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-72 absolute"
          }`}
        >
          {/* Palette Header */}
          <div className="p-3.5 border-b border-[#DBDED4] flex items-center justify-between bg-[#F2F4EF]">
            <MonoLabel className="text-[#33608A] font-bold">[NODE PALETTE]</MonoLabel>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-[#74786F] hover:text-[#15191F] rounded hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Palette Search */}
          <div className="p-3 border-b border-[#DBDED4]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#74786F]" />
              <input
                type="text"
                placeholder="Search node types…"
                value={searchPalette}
                onChange={(e) => setSearchPalette(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#F2F4EF] border border-[#DBDED4] rounded text-xs focus:outline-none focus:border-[#EA5A2B]"
              />
            </div>
          </div>

          {/* Node Categories List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {/* Category: Triggers */}
            <div>
              <MonoLabel className="block mb-2 text-[#74786F]">🚀 TRIGGERS & INPUTS</MonoLabel>
              <div
                onClick={() =>
                  spawnNode("requestInputs", {
                    title: "Request Inputs",
                    product_text: "Sample query product input",
                    product_photo: null,
                  })
                }
                className="group p-2.5 rounded-md border border-[#DBDED4] bg-white hover:border-[#15191F] hover:shadow-xs transition-all cursor-pointer flex items-center gap-2.5"
              >
                <div className="p-1.5 rounded bg-[#F2F4EF] text-[#33608A]">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-[#EA5A2B]" style={display}>
                    Request Inputs
                  </div>
                  <div className="text-[10px] text-[#74786F]">Text query & photo trigger</div>
                </div>
              </div>
            </div>

            {/* Category: AI Models */}
            <div>
              <MonoLabel className="block mb-2 text-[#EA5A2B]">🧠 AI & LLM MODELS</MonoLabel>
              <div
                onClick={() =>
                  spawnNode("geminiPro", {
                    title: "Gemini 3.1 Pro",
                    prompt: "Analyze input product features",
                    model: "gemini-2.5-flash",
                    temperature: 0.7,
                  })
                }
                className="group p-2.5 rounded-md border border-[#DBDED4] bg-white hover:border-[#15191F] hover:shadow-xs transition-all cursor-pointer flex items-center gap-2.5"
              >
                <div className="p-1.5 rounded bg-[#EA5A2B]/10 text-[#EA5A2B]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-[#EA5A2B]" style={display}>
                    Gemini Flash / Pro LLM
                  </div>
                  <div className="text-[10px] text-[#74786F]">Multimodal prompt inference</div>
                </div>
              </div>
            </div>

            {/* Category: Processors */}
            <div>
              <MonoLabel className="block mb-2 text-[#1F8A6B]">⚙️ MEDIA & PROCESSORS</MonoLabel>
              <div
                onClick={() =>
                  spawnNode("cropImage", {
                    title: "Aspect Crop Processor",
                    aspectRatio: "1:1",
                    cropType: "tight",
                  })
                }
                className="group p-2.5 rounded-md border border-[#DBDED4] bg-white hover:border-[#15191F] hover:shadow-xs transition-all cursor-pointer flex items-center gap-2.5"
              >
                <div className="p-1.5 rounded bg-[#1F8A6B]/10 text-[#1F8A6B]">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-[#EA5A2B]" style={display}>
                    Aspect Ratio Cropper
                  </div>
                  <div className="text-[10px] text-[#74786F]">1:1, 16:9, 4:5 image crop</div>
                </div>
              </div>
            </div>

            {/* Category: Outputs */}
            <div>
              <MonoLabel className="block mb-2 text-[#33608A]">📤 OUTPUTS & DISPATCH</MonoLabel>
              <div
                onClick={() =>
                  spawnNode("responseNode", {
                    title: "Response Output",
                    text: "",
                  })
                }
                className="group p-2.5 rounded-md border border-[#DBDED4] bg-white hover:border-[#15191F] hover:shadow-xs transition-all cursor-pointer flex items-center gap-2.5"
              >
                <div className="p-1.5 rounded bg-[#33608A]/10 text-[#33608A]">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-[#EA5A2B]" style={display}>
                    Formatted Output Display
                  </div>
                  <div className="text-[10px] text-[#74786F]">Final response preview</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Toggle Palette Sidebar Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-4 top-4 z-30 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#15191F] text-white text-xs font-bold shadow-lg hover:bg-[#262C35] cursor-pointer"
            style={mono}
          >
            <PanelLeft className="h-4 w-4 text-[#EA5A2B]" />
            <span>NODE LIBRARY</span>
          </button>
        )}

        {/* ── Center ReactFlow Canvas Viewport ───────────────────── */}
        <div ref={canvasWrapperRef} className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_: any, node: any) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            className={gridMode === "dark" ? "bg-schematic-grid-dark" : "bg-schematic-grid"}
          >
            <Background color={gridMode === "dark" ? "#ffffff15" : "#DBDED4"} gap={28} size={1} />
            <Controls className="bg-white! border border-[#DBDED4]! shadow-md! rounded-md!" />
            <MiniMap
              className="bg-white! border border-[#DBDED4]! shadow-md! rounded-md overflow-hidden"
              nodeColor={(node: any) => {
                if (node.type === "geminiPro") return SIGNAL;
                if (node.type === "cropImage") return AUX;
                if (node.type === "requestInputs") return CIRCUIT;
                return INK;
              }}
            />

            {/* Floating Quick Canvas Control Bar */}
            <Panel position="bottom-right" className="m-4 flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-lg border border-[#DBDED4] shadow-md">
              <button
                onClick={() => setGridMode((g) => (g === "light" ? "dark" : "light"))}
                className="p-1.5 rounded hover:bg-[#F2F4EF] text-[#74786F] hover:text-[#15191F]"
                title="Toggle Grid Theme"
              >
                {gridMode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#EA5A2B]" />}
              </button>
              <button
                onClick={handleAutoLayout}
                className="p-1.5 rounded hover:bg-[#F2F4EF] text-[#74786F] hover:text-[#15191F]"
                title="Auto-Layout Graph"
              >
                <Layers className="h-4 w-4" />
              </button>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Right Inspector Drawer ─────────────────────────────── */}
        {selectedNode && (
          <aside className="z-30 w-80 bg-white border-l border-[#DBDED4] flex flex-col shadow-lg animate-in slide-in-from-right duration-200">
            {/* Inspector Header */}
            <div className="p-3.5 border-b border-[#DBDED4] bg-[#F2F4EF] flex items-center justify-between">
              <div>
                <MonoLabel className="text-[#EA5A2B] block">[NODE INSPECTOR]</MonoLabel>
                <h3 className="font-bold text-sm text-[#15191F]" style={display}>
                  {(selectedNode.data.title as string) || selectedNode.type}
                </h3>
              </div>
              <button onClick={() => setSelectedNodeId(null)} className="p-1 text-[#74786F] hover:text-[#15191F] rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inspector Tabs */}
            <div className="flex border-b border-[#DBDED4] bg-white text-[11px] font-bold" style={mono}>
              <button
                onClick={() => setInspectorTab("config")}
                className={`flex-1 py-2 text-center border-b-2 ${
                  inspectorTab === "config" ? "border-[#EA5A2B] text-[#EA5A2B]" : "border-transparent text-[#74786F]"
                }`}
              >
                CONFIG
              </button>
              <button
                onClick={() => setInspectorTab("payload")}
                className={`flex-1 py-2 text-center border-b-2 ${
                  inspectorTab === "payload" ? "border-[#EA5A2B] text-[#EA5A2B]" : "border-transparent text-[#74786F]"
                }`}
              >
                DATA
              </button>
              <button
                onClick={() => setInspectorTab("telemetry")}
                className={`flex-1 py-2 text-center border-b-2 ${
                  inspectorTab === "telemetry" ? "border-[#EA5A2B] text-[#EA5A2B]" : "border-transparent text-[#74786F]"
                }`}
              >
                STATUS
              </button>
              <button
                onClick={() => setInspectorTab("json")}
                className={`flex-1 py-2 text-center border-b-2 ${
                  inspectorTab === "json" ? "border-[#EA5A2B] text-[#EA5A2B]" : "border-transparent text-[#74786F]"
                }`}
              >
                JSON
              </button>
            </div>

            {/* Inspector Tab Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {inspectorTab === "config" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <MonoLabel className="block mb-1">NODE TITLE</MonoLabel>
                    <input
                      type="text"
                      value={(selectedNode.data.title as string) || ""}
                      onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                      className="w-full bg-[#F2F4EF] border border-[#DBDED4] rounded p-2 text-xs font-bold"
                    />
                  </div>

                  {selectedNode.type === "geminiPro" && (
                    <>
                      <div>
                        <MonoLabel className="block mb-1">PROMPT TEMPLATE</MonoLabel>
                        <textarea
                          rows={4}
                          value={(selectedNode.data.prompt as string) || ""}
                          onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                          className="w-full bg-[#F2F4EF] border border-[#DBDED4] rounded p-2 text-xs font-mono resize-none focus:border-[#EA5A2B]"
                          placeholder="Type LLM prompt here..."
                        />
                      </div>
                      <div>
                        <MonoLabel className="block mb-1">TEMPERATURE ({(selectedNode.data.temperature as number) ?? 0.7})</MonoLabel>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.1"
                          value={(selectedNode.data.temperature as number) ?? 0.7}
                          onChange={(e) => updateNodeData(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                          className="w-full accent-[#EA5A2B]"
                        />
                      </div>
                    </>
                  )}

                  {selectedNode.type === "cropImage" && (
                    <div>
                      <MonoLabel className="block mb-1">ASPECT RATIO</MonoLabel>
                      <select
                        value={(selectedNode.data.aspectRatio as string) || "1:1"}
                        onChange={(e) => updateNodeData(selectedNode.id, { aspectRatio: e.target.value })}
                        className="w-full bg-[#F2F4EF] border border-[#DBDED4] rounded p-2 text-xs font-bold"
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="4:5">4:5 Vertical</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#DBDED4]">
                    <button
                      onClick={() => {
                        setNodes(nodes.filter((n) => n.id !== selectedNode.id));
                        setSelectedNodeId(null);
                        pushToast("Node deleted from canvas.", "info");
                      }}
                      className="w-full py-2 rounded bg-[#B23A2E]/10 border border-[#B23A2E]/30 text-[#B23A2E] text-xs font-bold uppercase tracking-wider hover:bg-[#B23A2E] hover:text-white transition-colors cursor-pointer"
                      style={mono}
                    >
                      DELETE THIS NODE
                    </button>
                  </div>
                </div>
              )}

              {inspectorTab === "payload" && (
                <div className="flex flex-col gap-3">
                  <MonoLabel className="block">LIVE NODE DATA STATE</MonoLabel>
                  <pre className="p-3 bg-[#15191F] text-white rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedNode.data, null, 2)}
                  </pre>
                </div>
              )}

              {inspectorTab === "telemetry" && (
                <div className="flex flex-col gap-3">
                  <MonoLabel className="block">EXECUTION STATUS</MonoLabel>
                  <div className="p-3 rounded border border-[#DBDED4] bg-[#F2F4EF] flex items-center justify-between">
                    <span className="text-xs font-bold uppercase" style={mono}>
                      Status:
                    </span>
                    <StatusChip
                      label={executingNodes[selectedNode.id] || "IDLE"}
                      color={
                        executingNodes[selectedNode.id] === "running"
                          ? SIGNAL
                          : executingNodes[selectedNode.id] === "success"
                          ? SUCCESS
                          : executingNodes[selectedNode.id] === "failed"
                          ? FAILED
                          : GRAPHITE
                      }
                      pulse={executingNodes[selectedNode.id] === "running"}
                    />
                  </div>
                </div>
              )}

              {inspectorTab === "json" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <MonoLabel>RAW SPEC</MonoLabel>
                    <CopyButton text={JSON.stringify(selectedNode, null, 2)} />
                  </div>
                  <pre className="p-3 bg-[#15191F] text-white rounded text-[10px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedNode, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Telemetry Log Terminal Drawer ─────────────────── */}
      <div className={`z-40 border-t border-[#DBDED4] bg-[#15191F] text-white transition-all ${isLogTerminalOpen ? "h-36" : "h-9"}`}>
        {/* Terminal Header */}
        <div
          onClick={() => setIsLogTerminalOpen((open) => !open)}
          className="px-4 py-2 bg-[#0F1217] border-b border-white/10 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-xs font-mono">
            <Terminal className="h-4 w-4 text-[#EA5A2B]" />
            <span className="font-bold uppercase tracking-wider text-white">LIVE EXECUTION TELEMETRY LOG</span>
            <span className="text-[10px] text-[#74786F]">• {isRunning ? "STREAMING RUN DATA..." : "SYSTEM IDLE"}</span>
          </div>

          <button className="text-[#74786F] hover:text-white text-xs font-mono">{isLogTerminalOpen ? "COLLAPSE [↓]" : "EXPAND [↑]"}</button>
        </div>

        {/* Terminal Content */}
        {isLogTerminalOpen && (
          <div className="p-3 font-mono text-[11px] h-24 overflow-y-auto space-y-1 text-[#D2D5CB]">
            <div>[02:24:00] Pipeline initialized with {nodes.length} nodes and {edges.length} connections.</div>
            {isRunning && <div className="text-[#EA5A2B] animate-pulse">[02:24:01] ⚡ Executing Directed Acyclic Graph nodes...</div>}
            {Object.entries(executingNodes).map(([nodeId, status]) => (
              <div key={nodeId} className="flex items-center gap-2">
                <span className="text-[#74786F]">&gt;</span>
                <span className="text-white font-bold">{nodeId}</span>
                <span>status:</span>
                <span
                  className={
                    status === "success"
                      ? "text-[#1F8A6B] font-bold uppercase"
                      : status === "running"
                      ? "text-[#EA5A2B] font-bold uppercase"
                      : "text-[#74786F] uppercase"
                  }
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification Stack */}
      <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-xl text-xs font-bold animate-in slide-in-from-bottom-2 duration-200 ${
              toast.tone === "error"
                ? "bg-[#B23A2E] text-white border-[#B23A2E]"
                : toast.tone === "success"
                ? "bg-[#1F8A6B] text-white border-[#1F8A6B]"
                : "bg-[#15191F] text-white border-[#15191F]"
            }`}
            style={mono}
          >
            <Info className="h-4 w-4" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return (
    <ReactFlowProvider>
      <CanvasContent id={resolvedParams.id} />
    </ReactFlowProvider>
  );
}
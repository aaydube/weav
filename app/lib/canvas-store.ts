import { create } from "zustand";
import { Connection, Edge, EdgeChange, Node, NodeChange, addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isRunning: boolean;
  executingNodes: Record<string, "idle" | "running" | "success" | "failed">;
  runHistory: any[];
  
  // Handlers
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  
  // Validation
  isValidConnection: (connection: Connection) => boolean;
  
  // Execution Control
  setIsRunning: (running: boolean) => void;
  setExecutingNodes: (states: Record<string, "idle" | "running" | "success" | "failed">) => void;
  updateExecutingNode: (nodeId: string, state: "idle" | "running" | "success" | "failed") => void;
  setRunHistory: (history: any[]) => void;
  resetExecutionStates: () => void;
}

// Infer handle type based on ID
export function getHandleType(handleId: string | null): "text" | "image" | "unknown" {
  if (!handleId) return "unknown";
  const id = handleId.toLowerCase();
  if (id.includes("photo") || id.includes("image")) return "image";
  if (id.includes("text") || id.includes("tweet") || id.includes("prompt") || id === "output") return "text";
  return "unknown";
}

// DAG Cycle Check: returns true if target can reach source (creating a cycle)
export function wouldCreateCycle(sourceId: string, targetId: string, edges: Edge[]): boolean {
  if (sourceId === targetId) return true;

  // Build adjacency list
  const adj: Record<string, string[]> = {};
  edges.forEach((edge) => {
    if (!adj[edge.source]) adj[edge.source] = [];
    adj[edge.source].push(edge.target);
  });

  // Temporarily add the proposed edge
  if (!adj[sourceId]) adj[sourceId] = [];
  adj[sourceId].push(targetId);

  // Run DFS to find if target reaches source
  const visited = new Set<string>();
  const stack = new Set<string>();

  function hasCycleDFS(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    const neighbors = adj[node] || [];
    for (const neighbor of neighbors) {
      if (hasCycleDFS(neighbor)) return true;
    }

    stack.delete(node);
    return false;
  }

  // Check from target
  return hasCycleDFS(targetId);
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isRunning: false,
  executingNodes: {},
  runHistory: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection) => {
    if (get().isValidConnection(connection)) {
      set((state) => ({
        edges: addEdge(connection, state.edges),
      }));
    }
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      }),
    })),

  isValidConnection: (connection) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target) return false;

    // 1. Prevent self-connections
    if (source === target) return false;

    // 2. Validate DAG (no cycles)
    if (wouldCreateCycle(source, target, get().edges)) {
      console.warn("Connection rejected: would create a cycle (DAG violation)");
      return false;
    }

    // 3. Type-safety validation
    const sourceType = getHandleType(sourceHandle);
    const targetType = getHandleType(targetHandle);

    if (sourceType !== "unknown" && targetType !== "unknown" && sourceType !== targetType) {
      console.warn(`Connection rejected: type mismatch (${sourceType} -> ${targetType})`);
      return false;
    }

    return true;
  },

  setIsRunning: (isRunning) => set({ isRunning }),
  
  setExecutingNodes: (executingNodes) => set({ executingNodes }),
  
  updateExecutingNode: (nodeId, state) =>
    set((s) => ({
      executingNodes: {
        ...s.executingNodes,
        [nodeId]: state,
      },
    })),

  setRunHistory: (runHistory) => set({ runHistory }),

  resetExecutionStates: () => {
    const defaultStates: Record<string, "idle" | "running" | "success" | "failed"> = {};
    get().nodes.forEach((node) => {
      defaultStates[node.id] = "idle";
    });
    set({ executingNodes: defaultStates });
  },
}));

if (typeof window !== "undefined") {
  (window as any).useCanvasStore = useCanvasStore;
}

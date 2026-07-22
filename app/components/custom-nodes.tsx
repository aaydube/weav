"use client";

import React, { useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../lib/canvas-store";
import { Image as ImageIcon, Text, BrainCircuit, CheckCircle2, AlertCircle, UploadCloud, Sliders, Type } from "lucide-react";
import { INK, SIGNAL, CIRCUIT, GRAPHITE, LINE, SUCCESS, FAILED, AUX, mono, display, alpha, CornerMarks, MonoLabel } from "./weav-theme";

const MAX_UPLOAD_MB = 8;

// A visible, keyboard-focusable label tied to its control via htmlFor —
// wraps MonoLabel's visual style without losing the semantic <label>.
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="w-fit cursor-default">
      <MonoLabel>{children}</MonoLabel>
    </label>
  );
}

// Transloadit / Local file helper
function FileUploadZone({
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  currentValue,
}: {
  onUploadStart: () => void;
  onUploadSuccess: (url: string) => void;
  onUploadError: (err: string) => void;
  currentValue: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Shared validation + read path for both the file picker and drag-and-drop.
  // The native `accept` attribute only filters the browse dialog — it does
  // nothing for drops — so type/size are checked here regardless of source.
  const processFile = (file: File) => {
    setLocalError(null);

    if (!file.type.startsWith("image/")) {
      setLocalError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setLocalError(`That image is too large — keep it under ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    setUploading(true);
    onUploadStart();

    // Default premium local preview fallback
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        // Introduce small mock upload delay for UX
        setTimeout(() => {
          onUploadSuccess(base64Url);
          setUploading(false);
        }, 1500);
      };
      reader.onerror = () => {
        setLocalError("Couldn't read that file. Try again.");
        onUploadError("File read failed");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setLocalError("Upload failed. Try again.");
      onUploadError(err.message || "Upload failed");
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ""; // reset so re-selecting the same file still fires onChange
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        aria-label="Choose a product photo"
      />
      {currentValue ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group rounded-md overflow-hidden border aspect-video bg-[#FAFAF8] flex items-center justify-center transition-colors ${
            isDragOver ? "border-[#EA5A2B]" : "border-[#DBDED4]"
          }`}
        >
          <img src={currentValue} alt="Product upload" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
              isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isDragOver ? (
              <span className="text-xs font-semibold text-white uppercase tracking-wide">Drop to replace</span>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-md bg-white border border-[#DBDED4] text-xs font-semibold text-[#15191F] hover:bg-[#FAFAF8] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-1"
                aria-label="Replace product photo"
              >
                Replace Photo
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={uploading}
          className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-md transition-all aspect-video cursor-pointer focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-1 ${
            isDragOver
              ? "border-[#EA5A2B] bg-[#EA5A2B]/5 text-[#EA5A2B]"
              : "border-[#DBDED4] hover:border-[#B4B7AC] bg-[#FAFAF8] hover:bg-[#F4F4F1] text-[#74786F] hover:text-[#15191F]"
          }`}
          aria-label="Upload product photo"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 border-2 rounded-full animate-spin" style={{ borderColor: SIGNAL, borderTopColor: "transparent" }} />
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
                Processing image…
              </span>
            </div>
          ) : (
            <>
              <UploadCloud className={`h-6 w-6 mb-1.5 ${isDragOver ? "text-[#EA5A2B]" : "text-[#74786F]"}`} />
              <span className="text-xs font-semibold">{isDragOver ? "Drop image to upload" : "Upload Product Photo"}</span>
              <span className="text-[9px] mt-0.5" style={{ color: "#A3A69B" }}>
                Drag &amp; drop or browse
              </span>
            </>
          )}
        </button>
      )}
      {localError && (
        <div
          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] leading-snug"
          style={{ backgroundColor: alpha(FAILED, 0.08), color: FAILED, border: `1px solid ${alpha(FAILED, 0.25)}` }}
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-[1px]" />
          {localError}
        </div>
      )}
    </div>
  );
}

// Visual node frame: drafting-sheet corner marks + status-driven border/glow
function NodeContainer({
  id,
  title,
  kind,
  icon: Icon,
  children,
  selected,
  errorMessage,
  width = "w-72",
}: {
  id: string;
  title: string;
  kind: string;
  icon: any;
  children: React.ReactNode;
  selected: boolean;
  errorMessage?: string;
  width?: string;
}) {
  const executingNodes = useCanvasStore((s) => s.executingNodes);
  const status = executingNodes[id] || "idle";

  const statusStyle = (): React.CSSProperties => {
    switch (status) {
      case "running":
        return { borderColor: SIGNAL, boxShadow: `0 0 0 1px ${alpha(SIGNAL, 0.25)}, 0 0 18px ${alpha(SIGNAL, 0.18)}` };
      case "success":
        return { borderColor: SUCCESS, boxShadow: `0 0 0 1px ${alpha(SUCCESS, 0.15)}` };
      case "failed":
        return { borderColor: FAILED, boxShadow: `0 0 0 1px ${alpha(FAILED, 0.15)}` };
      default:
        return selected
          ? { borderColor: "#B4B7AC", boxShadow: "0 0 0 2px rgba(21,25,31,0.05), 0 4px 10px rgba(21,25,31,0.08)" }
          : { borderColor: LINE, boxShadow: "0 1px 2px rgba(21,25,31,0.03)" };
    }
  };

  return (
    <div
      className={`relative ${width} bg-white/95 border rounded-lg p-4 flex flex-col gap-3.5 backdrop-blur-md transition-all duration-300`}
      style={statusStyle()}
    >
      <CornerMarks opacity={0.1} size="h-2 w-2" />

      <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: "#EDEEE8" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-md border"
            style={
              status === "running"
                ? { backgroundColor: alpha(SIGNAL, 0.08), borderColor: alpha(SIGNAL, 0.3), color: SIGNAL }
                : { backgroundColor: "#FAFAF8", borderColor: LINE, color: GRAPHITE }
            }
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm tracking-tight" style={{ ...display, color: INK }}>
              {title}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
              {kind}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {status === "running" && (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: SIGNAL }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: SIGNAL }} />
            </span>
          )}
          {status === "success" && <CheckCircle2 className="h-4 w-4" style={{ color: SUCCESS }} />}
          {status === "failed" && <AlertCircle className="h-4 w-4" style={{ color: FAILED }} />}
        </div>
      </div>

      {/* Inline failure detail — lets a person see what went wrong without
          leaving the canvas to open the run history drawer. */}
      {status === "failed" && errorMessage && (
        <div
          className="flex items-start gap-1.5 px-2.5 py-2 rounded-md text-[10px] leading-snug max-h-16 overflow-y-auto -mt-1.5"
          style={{ backgroundColor: alpha(FAILED, 0.06), color: "#8A2E22", border: `1px solid ${alpha(FAILED, 0.22)}` }}
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-[1px]" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// Small square "pin" handle in the drafting-schematic style, with an inline mono type label.
function PinHandle({
  type,
  position,
  id: handleId,
  color,
  label,
  labelIcon: LabelIcon,
  side,
}: {
  type: "source" | "target";
  position: Position;
  id: string;
  color: string;
  label: string;
  labelIcon?: any;
  side: "left" | "right";
}) {
  return (
    <>
      <Handle
        type={type}
        position={position}
        id={handleId}
        className="!h-3.5 !w-3.5 !rounded-[2px] !border-2 !border-white hover:!scale-125 transition-transform"
        style={{ backgroundColor: color, boxShadow: "0 0 0 1px rgba(21,25,31,0.12)" }}
      />
      <div
        className={`absolute ${side === "right" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-80 text-[9px] font-bold uppercase tracking-wider select-none pointer-events-none whitespace-nowrap`}
        style={{ ...mono, color }}
      >
        {side === "left" && LabelIcon && <LabelIcon className="h-2.5 w-2.5" />}
        {label}
        {side === "right" && LabelIcon && <LabelIcon className="h-2.5 w-2.5" />}
      </div>
    </>
  );
}

// 1. Request Inputs Node
export function RequestInputsNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <NodeContainer
      id={id}
      title={(data.title as string) || "Request Inputs"}
      kind="Entry · request"
      icon={Sliders}
      selected={selected}
      errorMessage={data.error as string}
    >
      {/* Handles */}
      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${id}-product-text`}>Product Info (Text)</FieldLabel>
          <textarea
            id={`${id}-product-text`}
            value={(data.product_text as string) || ""}
            onChange={(e) => updateNodeData(id, { product_text: e.target.value })}
            placeholder="Describe the product..."
            className="w-full min-h-[60px] px-3 py-1.5 text-xs bg-[#FAFAF8] border border-[#DBDED4] focus:bg-white rounded-md text-[#15191F] placeholder-[#A3A69B] focus:outline-none focus:ring-1 focus:ring-[#EA5A2B] nodrag leading-relaxed resize-none"
          />
        </div>

        <div className="absolute top-[40px] -right-[19px]">
          <PinHandle type="source" position={Position.Right} id="product_text" color={CIRCUIT} label="Text" labelIcon={Text} side="right" />
        </div>
      </div>

      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <MonoLabel>Product Photo</MonoLabel>
          <FileUploadZone
            onUploadStart={() => {}}
            onUploadSuccess={(url) => updateNodeData(id, { product_photo: url })}
            onUploadError={(err) => console.error("Product photo upload failed:", err)}
            currentValue={(data.product_photo as string) || null}
          />
        </div>

        <div className="absolute top-[35px] -right-[19px]">
          <PinHandle type="source" position={Position.Right} id="product_photo" color={AUX} label="Image" labelIcon={ImageIcon} side="right" />
        </div>
      </div>
    </NodeContainer>
  );
}

// 2. Crop Image Node
export function CropImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <NodeContainer
      id={id}
      title={(data.title as string) || "Crop Image"}
      kind="Transform · crop"
      icon={ImageIcon}
      selected={selected}
      errorMessage={data.error as string}
    >
      {/* Target input handle (Left) */}
      <div className="relative">
        <PinHandle type="target" position={Position.Left} id="image" color={AUX} label="Input Image" side="left" />
      </div>

      {/* Select settings */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${id}-aspect-ratio`}>Aspect Ratio</FieldLabel>
          <select
            id={`${id}-aspect-ratio`}
            value={(data.aspectRatio as string) || "1:1"}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-[#FAFAF8] border border-[#DBDED4] rounded-md text-[#15191F] focus:outline-none focus:ring-1 focus:ring-[#EA5A2B] cursor-pointer nodrag"
          >
            <option value="1:1">1:1 (Tight Crop)</option>
            <option value="16:9">16:9 (Wide Banner)</option>
            <option value="4:3">4:3 (Standard)</option>
          </select>
        </div>

        {data.cropped_image ? (
          <div className="rounded-md overflow-hidden border border-[#DBDED4] aspect-video bg-[#FAFAF8] flex items-center justify-center">
            <img src={data.cropped_image as string} alt="Crop preview" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[#DBDED4] aspect-video bg-[#FAFAF8]/50 flex flex-col items-center justify-center text-[#A3A69B]">
            <ImageIcon className="h-5 w-5 mb-1" style={{ color: "#C7C9C0" }} />
            <span className="text-[9px] font-bold tracking-wide uppercase">Waiting for input</span>
          </div>
        )}
      </div>

      {/* Source output handle (Right) */}
      <div className="relative mt-2">
        <div className="absolute -right-[19px] top-1/2 -translate-y-1/2">
          <PinHandle type="source" position={Position.Right} id="cropped_image" color={AUX} label="Cropped Image" side="right" />
        </div>
      </div>
    </NodeContainer>
  );
}

// 3. Gemini 3.1 Pro Node
export function GeminiProNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const temperature = (data.temperature as number) ?? 0.7;

  return (
    <NodeContainer
      id={id}
      title={(data.title as string) || "Gemini 3.1 Pro"}
      kind="Model · llm executor"
      icon={BrainCircuit}
      selected={selected}
      width="w-80"
      errorMessage={data.error as string}
    >
      {/* Multiple target handles for flexibility */}
      <div className="flex flex-col gap-1.5">
        <div className="relative h-6">
          <PinHandle type="target" position={Position.Left} id="text" color={CIRCUIT} label="Text Input" labelIcon={Text} side="left" />
        </div>
        <div className="relative h-6">
          <PinHandle type="target" position={Position.Left} id="tweet" color={CIRCUIT} label="Tweet Input" labelIcon={Type} side="left" />
        </div>
        <div className="relative h-6">
          <PinHandle type="target" position={Position.Left} id="image_1" color={AUX} label="Image 1" labelIcon={ImageIcon} side="left" />
        </div>
        <div className="relative h-6">
          <PinHandle type="target" position={Position.Left} id="image_2" color={AUX} label="Image 2" labelIcon={ImageIcon} side="left" />
        </div>
      </div>

      {/* Node Configurations */}
      <div className="flex flex-col gap-2.5 mt-1">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${id}-prompt`}>System Prompt</FieldLabel>
          <textarea
            id={`${id}-prompt`}
            value={(data.prompt as string) || ""}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder="Write dynamic prompt using {variables}..."
            className="w-full min-h-[115px] px-3 py-1.5 text-[10px] bg-[#FAFAF8] border border-[#DBDED4] focus:bg-white rounded-md text-[#15191F] placeholder-[#A3A69B] focus:outline-none focus:ring-1 focus:ring-[#EA5A2B] nodrag leading-relaxed resize-none"
            style={mono}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label htmlFor={`${id}-model`} className="text-[9px] font-bold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
              Model
            </label>
            <select
              id={`${id}-model`}
              value={(data.model as string) || "gemini-2.5-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="w-full px-2 py-1 text-[10px] bg-[#FAFAF8] border border-[#DBDED4] rounded text-[#15191F] focus:outline-none focus:ring-1 focus:ring-[#EA5A2B] nodrag cursor-pointer"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label htmlFor={`${id}-temperature`} className="text-[9px] font-bold uppercase tracking-wider" style={{ ...mono, color: GRAPHITE }}>
              Temp: {temperature}
            </label>
            <input
              id={`${id}-temperature`}
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
              className="w-full nodrag accent-[#EA5A2B] cursor-pointer py-1 focus-visible:ring-2 focus-visible:ring-[#EA5A2B] focus-visible:ring-offset-1 rounded"
              aria-label={`Temperature, currently ${temperature}`}
            />
            <div className="flex items-center justify-between text-[8px] font-semibold" style={{ color: "#A3A69B" }}>
              <span>0 · precise</span>
              <span>1.5 · creative</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source output handle (Right) */}
      <div className="relative mt-2">
        <div className="absolute -right-[19px] top-1/2 -translate-y-1/2">
          <PinHandle type="source" position={Position.Right} id="output" color={CIRCUIT} label="Response Text" side="right" />
        </div>
      </div>
    </NodeContainer>
  );
}

// 4. Response Output Node
export function ResponseNode({ id, data, selected }: NodeProps) {
  return (
    <NodeContainer
      id={id}
      title={(data.title as string) || "Response Output"}
      kind="Exit · final output"
      icon={CheckCircle2}
      selected={selected}
      errorMessage={data.error as string}
    >
      {/* Target input handles (Left) */}
      <div className="flex flex-col gap-1.5">
        <div className="relative h-5">
          <PinHandle type="target" position={Position.Left} id="text" color={CIRCUIT} label="Final Copy (Text)" side="left" />
        </div>
        <div className="relative h-5">
          <PinHandle type="target" position={Position.Left} id="image_1" color={AUX} label="Photo 1 (Tight)" side="left" />
        </div>
        <div className="relative h-5">
          <PinHandle type="target" position={Position.Left} id="image_2" color={AUX} label="Photo 2 (Wide)" side="left" />
        </div>
      </div>

      {/* Renders outputs side-by-side or stacked */}
      <div className="flex flex-col gap-3 pt-2.5 border-t" style={{ borderColor: "#EDEEE8" }}>
        <div className="flex flex-col gap-1">
          <MonoLabel>Marketing Post Copy</MonoLabel>
          {data.text ? (
            <div className="w-full p-3 bg-[#FAFAF8] border border-[#DBDED4] rounded-md font-sans text-[11px] leading-relaxed text-[#15191F] max-h-[160px] overflow-y-auto space-y-1.5">
              {(data.text as string)
                .split("\n")
                .filter((line: string) => line.trim() !== "")
                .map((line: string, i: number) => {
                  if (/^#{1,2}\s/.test(line)) {
                    return (
                      <p key={i} className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ ...mono, color: GRAPHITE }}>
                        {line.replace(/^#{1,2}\s/, "")}
                      </p>
                    );
                  }
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} className={line.startsWith("•") || line.startsWith("-") ? "pl-2" : ""}>
                      {parts.map((part: string, j: number) =>
                        /^\*\*(.+)\*\*$/.test(part) ? (
                          <span key={j} className="font-semibold" style={{ color: INK }}>
                            {part.replace(/\*\*/g, "")}
                          </span>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </p>
                  );
                })}
            </div>
          ) : (
            <div className="w-full py-4 text-center border border-dashed border-[#DBDED4] bg-[#FAFAF8]/50 rounded-md text-[#A3A69B] text-[10px] uppercase tracking-wider font-semibold">
              No Copy Output Yet
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <MonoLabel>Cropped Image Assets</MonoLabel>
          <div className="grid grid-cols-2 gap-2">
            {data.image_1 ? (
              <div className="rounded overflow-hidden border border-[#DBDED4] aspect-square bg-[#FAFAF8]">
                <img src={data.image_1 as string} alt="Asset 1" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border border-dashed border-[#DBDED4] rounded aspect-square bg-[#FAFAF8]/60 flex flex-col items-center justify-center text-[#A3A69B]">
                <ImageIcon className="h-4 w-4" style={{ color: "#C7C9C0" }} />
                <span className="text-[7.5px] uppercase font-bold mt-1">Photo 1</span>
              </div>
            )}

            {data.image_2 ? (
              <div className="rounded overflow-hidden border border-[#DBDED4] aspect-square bg-[#FAFAF8]">
                <img src={data.image_2 as string} alt="Asset 2" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border border-dashed border-[#DBDED4] rounded aspect-square bg-[#FAFAF8]/60 flex flex-col items-center justify-center text-[#A3A69B]">
                <ImageIcon className="h-4 w-4" style={{ color: "#C7C9C0" }} />
                <span className="text-[7.5px] uppercase font-bold mt-1">Photo 2</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </NodeContainer>
  );
}

// React Flow Custom Node Types Map
export const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage: CropImageNode,
  geminiPro: GeminiProNode,
  responseNode: ResponseNode,
};
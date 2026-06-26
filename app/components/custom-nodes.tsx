"use client";

import React, { useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../lib/canvas-store";
import { Image as ImageIcon, Text, BrainCircuit, Play, CheckCircle2, AlertCircle, UploadCloud, Sliders, Type } from "lucide-react";

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        onUploadError("File read failed");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      onUploadError(err.message || "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {currentValue ? (
        <div className="relative group rounded-xl overflow-hidden border border-zinc-200 aspect-video bg-zinc-50 flex items-center justify-center shadow-sm/5">
          <img src={currentValue} alt="Product Upload" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs font-semibold hover:bg-zinc-50 text-zinc-700 transition-colors cursor-pointer"
            >
              Replace Photo
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl transition-all aspect-video cursor-pointer text-zinc-500 hover:text-zinc-700 shadow-sm/5"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Uploading via Transloadit...</span>
            </div>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-zinc-400 mb-1.5" />
              <span className="text-xs font-semibold">Upload Product Photo</span>
              <span className="text-[9px] text-zinc-450 mt-0.5">Drag & drop or browse</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Visual Node State Wrapper for active state borders and glowing
function NodeContainer({
  id,
  title,
  icon: Icon,
  children,
  selected,
}: {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
  selected: boolean;
}) {
  const executingNodes = useCanvasStore((s) => s.executingNodes);
  const status = executingNodes[id] || "idle";

  const getStatusClasses = () => {
    switch (status) {
      case "running":
        return "border-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.3)] animate-pulse scale-[1.01]";
      case "success":
        return "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
      case "failed":
        return "border-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
      default:
        return selected ? "border-zinc-400 shadow-md ring-1 ring-zinc-200" : "border-zinc-200 hover:border-zinc-300 shadow-sm bg-white";
    }
  };

  return (
    <div
      className={`w-72 bg-white/95 border rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-md transition-all duration-300 ${getStatusClasses()}`}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-150">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${status === "running" ? "bg-violet-50 border-violet-200 text-violet-600" : "bg-zinc-50 border-zinc-150 text-zinc-500"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-zinc-750 tracking-tight">{title}</span>
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-1">
          {status === "running" && (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600"></span>
            </span>
          )}
          {status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {status === "failed" && <AlertCircle className="h-4 w-4 text-rose-600" />}
        </div>
      </div>

      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// 1. Request Inputs Node
export function RequestInputsNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <NodeContainer id={id} title={data.title as string || "Request Inputs"} icon={Sliders} selected={selected}>
      {/* Handles */}
      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Product Info (Text)</label>
          <textarea
            value={(data.product_text as string) || ""}
            onChange={(e) => updateNodeData(id, { product_text: e.target.value })}
            placeholder="Describe the product..."
            className="w-full min-h-[60px] px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 focus:bg-white rounded-lg text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500 nodrag leading-relaxed"
          />
        </div>

        {/* Text Handle on the Right */}
        <div className="absolute top-[40px] -right-[22px]">
          <Handle
            type="source"
            position={Position.Right}
            id="product_text"
            className="h-8 w-8 bg-violet-500 border-2 border-white !rounded-md hover:bg-violet-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-violet-600 uppercase tracking-wider select-none pointer-events-none">
            <Text className="h-2.5 w-2.5" /> Text
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Product Photo</label>
          <FileUploadZone
            onUploadStart={() => { }}
            onUploadSuccess={(url) => updateNodeData(id, { product_photo: url })}
            onUploadError={(err) => alert(err)}
            currentValue={(data.product_photo as string) || null}
          />
        </div>

        {/* Image Handle on the Right */}
        <div className="absolute top-[35px] -right-[22px]">
          <Handle
            type="source"
            position={Position.Right}
            id="product_photo"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            <ImageIcon className="h-2.5 w-2.5" /> Image
          </div>
        </div>
      </div>
    </NodeContainer>
  );
}

// 2. Crop Image Node
export function CropImageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <NodeContainer id={id} title={data.title as string || "Crop Image"} icon={ImageIcon} selected={selected}>
      {/* Target input handle (Left) */}
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          id="image"
          className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
          Input Image
        </div>
      </div>

      {/* Select settings */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Aspect Ratio</label>
          <select
            value={(data.aspectRatio as string) || "1:1"}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer nodrag"
          >
            <option value="1:1">1:1 (Tight Crop)</option>
            <option value="16:9">16:9 (Wide Banner)</option>
            <option value="4:3">4:3 (Standard)</option>
          </select>
        </div>

        {/* Cropped Preview if present */}
        {data.cropped_image ? (
          <div className="rounded-xl overflow-hidden border border-zinc-200 aspect-video bg-zinc-50 flex items-center justify-center shadow-sm/5">
            <img src={data.cropped_image as string} alt="Crop Preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 border-dashed aspect-video bg-zinc-50/30 flex flex-col items-center justify-center text-zinc-400">
            <ImageIcon className="h-5 w-5 mb-1 text-zinc-300" />
            <span className="text-[9px] font-bold tracking-wide uppercase">Waiting for input</span>
          </div>
        )}
      </div>

      {/* Source output handle (Right) */}
      <div className="relative mt-2">
        <div className="absolute -right-[22px] top-1/2 -translate-y-1/2">
          <Handle
            type="source"
            position={Position.Right}
            id="cropped_image"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            Cropped Image
          </div>
        </div>
      </div>
    </NodeContainer>
  );
}

// 3. Gemini 3.1 Pro Node
export function GeminiProNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  return (
    <NodeContainer id={id} title={data.title as string || "Gemini 3.1 Pro"} icon={BrainCircuit} selected={selected}>
      {/* Multiple target handles for flexibility */}
      <div className="flex flex-col gap-1.5">
        {/* Input Text Handle */}
        <div className="relative h-6">
          <Handle
            type="target"
            position={Position.Left}
            id="text"
            className="h-8 w-8 bg-violet-500 border-2 border-white !rounded-md hover:bg-violet-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-violet-600 uppercase tracking-wider select-none pointer-events-none">
            <Text className="h-2.5 w-2.5" /> Text Input
          </div>
        </div>

        {/* Input Tweet Handle */}
        <div className="relative h-6">
          <Handle
            type="target"
            position={Position.Left}
            id="tweet"
            className="h-8 w-8 bg-violet-500 border-2 border-white !rounded-md hover:bg-violet-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-violet-600 uppercase tracking-wider select-none pointer-events-none">
            <Type className="h-2.5 w-2.5" /> Tweet Input
          </div>
        </div>

        {/* Input Image 1 Handle */}
        <div className="relative h-6">
          <Handle
            type="target"
            position={Position.Left}
            id="image_1"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            <ImageIcon className="h-2.5 w-2.5" /> Image 1
          </div>
        </div>

        {/* Input Image 2 Handle */}
        <div className="relative h-6">
          <Handle
            type="target"
            position={Position.Left}
            id="image_2"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            <ImageIcon className="h-2.5 w-2.5" /> Image 2
          </div>
        </div>
      </div>

      {/* Node Configurations */}
      <div className="flex flex-col gap-2.5 mt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">System Prompt</label>
          <textarea
            value={(data.prompt as string) || ""}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder="Write dynamic prompt using {variables}..."
            className="w-full min-h-[115px] px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 focus:bg-white rounded-lg text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500 nodrag font-mono text-[10px] leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Model</span>
            <select
              value={(data.model as string) || "gemini-1.5-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="w-full px-2 py-1 text-[10px] bg-zinc-50 border border-zinc-200 rounded-md text-zinc-700 focus:outline-none nodrag cursor-pointer"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Temp: {data.temperature as number || 0.7}</span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={(data.temperature as number) || 0.7}
              onChange={(e) => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
              className="w-full nodrag accent-violet-650 cursor-pointer py-1"
            />
          </div>
        </div>

      </div>

      {/* Source output handle (Right) */}
      <div className="relative mt-2">
        <div className="absolute -right-[22px] top-1/2 -translate-y-1/2">
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="h-8 w-8 bg-violet-500 border-2 border-white !rounded-md hover:bg-violet-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-violet-600 uppercase tracking-wider select-none pointer-events-none">
            Response Text
          </div>
        </div>
      </div>
    </NodeContainer>
  );
}

// 4. Response Output Node
export function ResponseNode({ id, data, selected }: NodeProps) {
  return (
    <NodeContainer id={id} title={data.title as string || "Response Output"} icon={CheckCircle2} selected={selected}>
      {/* Target input handles (Left) */}
      <div className="flex flex-col gap-1.5">
        <div className="relative h-5">
          <Handle
            type="target"
            position={Position.Left}
            id="text"
            className="h-8 w-8 bg-violet-500 border-2 border-white !rounded-md hover:bg-violet-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-violet-600 uppercase tracking-wider select-none pointer-events-none">
            Final Copy (Text)
          </div>
        </div>

        <div className="relative h-5">
          <Handle
            type="target"
            position={Position.Left}
            id="image_1"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            Photo 1 (Tight)
          </div>
        </div>

        <div className="relative h-5">
          <Handle
            type="target"
            position={Position.Left}
            id="image_2"
            className="h-8 w-8 bg-fuchsia-500 border-2 border-white !rounded-md hover:bg-fuchsia-400 hover:scale-110 transition-transform shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-fuchsia-600 uppercase tracking-wider select-none pointer-events-none">
            Photo 2 (Wide)
          </div>
        </div>
      </div>

      {/* Renders outputs side-by-side or stacked */}
      <div className="flex flex-col gap-3 pt-2.5 border-t border-zinc-150">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Marketing Post Copy</span>
          {data.text ? (
            <div className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-sans text-[11px] leading-relaxed text-zinc-700 max-h-[160px] overflow-y-auto space-y-1.5">
              {(data.text as string)
                .split('\n')
                .filter((line: string) => line.trim() !== '')
                .map((line: string, i: number) => {
                  // Section heading: lines starting with ## or #
                  if (/^#{1,2}\s/.test(line)) {
                    return (
                      <p key={i} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pt-1">
                        {line.replace(/^#{1,2}\s/, '')}
                      </p>
                    );
                  }
                  // Render inline **bold** segments
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} className={line.startsWith('•') || line.startsWith('-') ? 'pl-2' : ''}>
                      {parts.map((part: string, j: number) =>
                        /^\*\*(.+)\*\*$/.test(part) ? (
                          <span key={j} className="font-semibold text-zinc-800">
                            {part.replace(/\*\*/g, '')}
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
            <div className="w-full py-4 text-center border border-dashed border-zinc-250 bg-zinc-50/30 rounded-xl text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
              No Copy Output Yet
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">Cropped Images Assets</span>
          <div className="grid grid-cols-2 gap-2">
            {data.image_1 ? (
              <div className="rounded-lg overflow-hidden border border-zinc-200 aspect-square bg-zinc-50 shadow-sm/5">
                <img src={data.image_1 as string} alt="Asset 1" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border border-dashed border-zinc-200 rounded-lg aspect-square bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400">
                <ImageIcon className="h-4 w-4 text-zinc-300" />
                <span className="text-[7.5px] uppercase font-bold mt-1">Photo 1</span>
              </div>
            )}

            {data.image_2 ? (
              <div className="rounded-lg overflow-hidden border border-zinc-200 aspect-square bg-zinc-50 shadow-sm/5">
                <img src={data.image_2 as string} alt="Asset 2" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border border-dashed border-zinc-200 rounded-lg aspect-square bg-zinc-50/50 flex flex-col items-center justify-center text-zinc-400">
                <ImageIcon className="h-4 w-4 text-zinc-300" />
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

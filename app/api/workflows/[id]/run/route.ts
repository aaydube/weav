import { NextResponse } from "next/server";
import { db, getPrismaClient } from "../../../../lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserId } from "../../../../lib/auth-util";
import { cropImageTask } from "@/trigger/cropImage";
import { runGeminiTask } from "@/trigger/geminiNode";
import { tasks, runs } from "@trigger.dev/sdk";

// Background executor
async function runWorkflowExecutor(
  runId: string,
  workflowId: string,
  userId: string,
  nodes: any[],
  edges: any[],
  runOnlyNodeIds?: string[]
) {
  const nodeStates: Record<string, { status: string; output: any; startedAt?: number; duration?: number }> = {};
  
  // Initialize states
  const hasFilter = Array.isArray(runOnlyNodeIds) && runOnlyNodeIds.length > 0;
  nodes.forEach((n) => {
    if (hasFilter) {
      const isTarget = runOnlyNodeIds.includes(n.id);
      nodeStates[n.id] = { 
        status: isTarget ? "pending" : "success", 
        output: n.data 
      };
    } else {
      nodeStates[n.id] = { status: "pending", output: null };
    }
  });

  // Save initial run log
  await db.updateWorkflow(workflowId, userId, { status: "RUNNING" });
  await updateRunLog(runId, "RUNNING", 0, nodeStates);

  const startTime = Date.now();

  try {
    // DFS / Topological search runner
    const runNextNodes = async (): Promise<void> => {
      // Check if the run has been cancelled
      const currentRun = await db.getRun(runId);
      if (currentRun && currentRun.status === "CANCELLED") {
        throw new Error("WORKFLOW_RUN_CANCELLED");
      }

      // Find all nodes that are currently 'pending' and have all their parent nodes in 'success'
      const runnableNodes = nodes.filter((node) => {
        if (nodeStates[node.id].status !== "pending") return false;

        // Find incoming edges
        const incoming = edges.filter((e) => e.target === node.id);
        if (incoming.length === 0) {
          // If no dependencies, and it's RequestInputs, it is pre-completed
          if (node.type === "requestInputs") {
            nodeStates[node.id] = {
              status: "success",
              output: {
                product_text: node.data.product_text,
                product_photo: node.data.product_photo,
              },
            };
            return false;
          }
          return true; // Sibling with no inputs is immediately runnable
        }

        // Check if all parent nodes have finished successfully
        return incoming.every((edge) => nodeStates[edge.source]?.status === "success");
      });

      if (runnableNodes.length === 0) {
        // If there are still pending nodes, but nothing is runnable, we are done or stuck
        return;
      }

      // Execute runnable nodes in parallel
      await Promise.all(
        runnableNodes.map(async (node) => {
          nodeStates[node.id].status = "running";
          nodeStates[node.id].startedAt = Date.now();
          
          // Save progress
          await updateRunLog(runId, "RUNNING", Date.now() - startTime, nodeStates);

          try {
            // Process based on type
            if (node.type === "cropImage") {
              // 1. Gather input image url from parents
              const incomingImageEdge = edges.find((e) => e.target === node.id && e.targetHandle === "image");
              const inputImage = incomingImageEdge
                ? (nodeStates[incomingImageEdge.source]?.output?.product_photo || 
                   nodeStates[incomingImageEdge.source]?.output?.cropped_image ||
                   nodeStates[incomingImageEdge.source]?.output?.croppedImage ||
                   nodeStates[incomingImageEdge.source]?.output?.productPhoto ||
                   nodeStates[incomingImageEdge.source]?.output?.output)
                : null;

              if (!inputImage) {
                throw new Error("No image input connected");
              }

              // ---------------------------------------------------------
              // TRIGGER.DEV INTEGRATION: CROP IMAGE
              // ---------------------------------------------------------
              // Step 1: Fire the task — pass aspectRatio (what the node actually stores)
              const handle = await tasks.trigger<typeof cropImageTask>("crop-image-task", {
                imageUrl: inputImage,
                aspectRatio: (node.data.aspectRatio as string) || "1:1",
              });

              // Step 2: Poll for completion
              const run = await runs.poll(handle, { pollIntervalMs: 1000 });

              // Step 3: Process result
              if (run.status === "COMPLETED") {
                nodeStates[node.id].status = "success";
                nodeStates[node.id].output = { cropped_image: run.output?.croppedImageUrl };
                nodeStates[node.id].duration = Date.now() - (nodeStates[node.id].startedAt || 0);
              } else {
                throw new Error(`Trigger.dev Crop Task failed with status: ${run.status}`);
              }

            } else if (node.type === "geminiPro") {
              // Gather prompt template variables
              const promptTemplate = node.data.prompt || "";
              let prompt = promptTemplate;

              // Find all incoming connections
              const incomingEdges = edges.filter((e) => e.target === node.id);
              const parentOutputs: Record<string, string> = {};
              const images: string[] = [];

              incomingEdges.forEach((edge) => {
                const parentOutput = nodeStates[edge.source]?.output;
                if (!parentOutput) return;

                // Grab string values or cropped images from parent outputs
                const sourceHandle = edge.sourceHandle || "";
                const targetHandle = edge.targetHandle || "";

                if (sourceHandle === "product_text") {
                  parentOutputs["product_text"] = parentOutput.product_text || "";
                } else if (sourceHandle === "output") {
                  parentOutputs["long_description"] = parentOutput.output || "";
                  parentOutputs["tweet"] = parentOutput.output || "";
                } else if (sourceHandle === "product_photo") {
                  parentOutputs["product_photo"] = "[Product Photo]";
                } else if (sourceHandle === "cropped_image") {
                  parentOutputs["cropped_image"] = "[Cropped Image]";
                }

                // If target handle is image_1 or image_2, collect the image URL/base64
                if (targetHandle === "image_1") {
                  const imageUrl = parentOutput.cropped_image || parentOutput.product_photo || parentOutput.output;
                  if (imageUrl) {
                    images.push(imageUrl);
                    parentOutputs["cropped_image_1"] = "[Cropped Image 1]";
                    parentOutputs["image_1"] = "[Image 1]";
                  }
                } else if (targetHandle === "image_2") {
                  const imageUrl = parentOutput.cropped_image || parentOutput.product_photo || parentOutput.output;
                  if (imageUrl) {
                    images.push(imageUrl);
                    parentOutputs["cropped_image_2"] = "[Cropped Image 2]";
                    parentOutputs["image_2"] = "[Image 2]";
                  }
                }
              });

              // Replace variables like {product_text}, {long_description}, {tweet}, etc.
              Object.entries(parentOutputs).forEach(([key, val]) => {
                prompt = prompt.replace(new RegExp(`{${key}}`, "g"), val);
              });

              // ---------------------------------------------------------
              // TRIGGER.DEV INTEGRATION: GEMINI PRO
              // ---------------------------------------------------------
              const rawModelName = node.data.model || "gemini-1.5-pro";
              
              // Step 1: Fire the task
              console.log("DEBUG: Sending to Gemini ->", { 
    promptLength: prompt.length,
    containsPlaceholder: prompt.includes("{") 
});
              const handle = await tasks.trigger<typeof runGeminiTask>("run-gemini", {
                prompt: prompt,
                model: rawModelName,
                systemPrompt: node.data.systemPrompt,
                images: images,
              });

              // Step 2: Poll for completion
              const run = await runs.poll(handle, { pollIntervalMs: 1000 });

              // Step 3: Process result
              if (run.status === "COMPLETED") {
                nodeStates[node.id].status = "success";
                nodeStates[node.id].output = { output: run.output?.output };
                nodeStates[node.id].duration = Date.now() - (nodeStates[node.id].startedAt || 0);
              } else {
                throw new Error(`Trigger.dev Gemini Task failed with status: ${run.status}`);
              }

            } else if (node.type === "responseNode") {
              // Response node just collects outputs
              const incomingTextEdge = edges.find((e) => e.target === node.id && e.targetHandle === "text");
              const incomingImg1Edge = edges.find((e) => e.target === node.id && e.targetHandle === "image_1");
              const incomingImg2Edge = edges.find((e) => e.target === node.id && e.targetHandle === "image_2");

              const getImgVal = (srcId: string) => {
                const out = nodeStates[srcId]?.output;
                if (!out) return null;
                return out.cropped_image || out.croppedImage || out.croppedImageUrl || out.product_photo || out.productPhoto || out.output || null;
              };

              const text = incomingTextEdge ? nodeStates[incomingTextEdge.source]?.output?.output : "";
              const img1 = incomingImg1Edge ? getImgVal(incomingImg1Edge.source) : null;
              const img2 = incomingImg2Edge ? getImgVal(incomingImg2Edge.source) : null;

              nodeStates[node.id].status = "success";
              nodeStates[node.id].output = { text, image_1: img1, image_2: img2 };
              nodeStates[node.id].duration = Date.now() - (nodeStates[node.id].startedAt || 0);
            }
          } catch (e: any) {
            console.error(`Node ${node.id} execution failed:`, e);
            nodeStates[node.id].status = "failed";
            nodeStates[node.id].output = { error: e.message || "Execution error" };
            nodeStates[node.id].duration = Date.now() - (nodeStates[node.id].startedAt || 0);
          }

          // Save progress
          await updateRunLog(runId, "RUNNING", Date.now() - startTime, nodeStates);
        })
      );

      // Recurse to run next topological layer
      await runNextNodes();
    };

    // Begin topological loop
    await runNextNodes();

    // Determine final status
    const allStates = Object.values(nodeStates);
    let finalStatus = "SUCCESS";
    if (allStates.some((s) => s.status === "failed")) {
      finalStatus = allStates.every((s) => s.status === "failed") ? "FAILED" : "PARTIAL";
    }

    // Check one final time if cancelled before marking SUCCESS
    const currentRun = await db.getRun(runId);
    if (currentRun && currentRun.status === "CANCELLED") {
      throw new Error("WORKFLOW_RUN_CANCELLED");
    }

    const duration = Date.now() - startTime;
    await updateRunLog(runId, finalStatus, duration, nodeStates);
    await db.updateWorkflow(workflowId, userId, { status: "IDLE" });

  } catch (e: any) {
    if (e.message === "WORKFLOW_RUN_CANCELLED") {
      console.log(`Workflow run ${runId} stopped because it was CANCELLED.`);
      await db.updateWorkflow(workflowId, userId, { status: "IDLE" });
      return;
    }
    console.error("Workflow executor crash:", e);
    const duration = Date.now() - startTime;
    try {
      await updateRunLog(runId, "FAILED", duration, nodeStates);
    } catch (_) {}
    await db.updateWorkflow(workflowId, userId, { status: "IDLE" });
  }
}

async function updateRunLog(
  runId: string,
  status: string,
  duration: number,
  logs: any
) {
  // Check current run status first
  const currentRun = await db.getRun(runId);
  if (currentRun && currentRun.status === "CANCELLED") {
    // If it's cancelled, we keep the status as CANCELLED, but we can still save logs/duration
    try {
      await db.updateRun(runId, {
        duration,
        logs: JSON.stringify(logs),
      });
    } catch (_) {}
    throw new Error("WORKFLOW_RUN_CANCELLED");
  }

  try {
    await db.updateRun(runId, {
      status,
      duration,
      logs: JSON.stringify(logs),
    });
  } catch (e) {
    console.error("Failed to update run log:", e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Check ownership of workflow before running/saving
    const workflow = await db.getWorkflow(id, userId);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }

    const { nodes, edges, runOnlyNodeIds } = await req.json();

    // 1. Auto-save current canvas to DB before running
    await db.updateWorkflow(id, userId, {
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });

    // 2. Create running record
    const run = await db.createRun(id, "RUNNING", 0, JSON.stringify({}));

    // 3. Trigger execution in background (do not await)
    runWorkflowExecutor(run.id, id, userId, nodes, edges, runOnlyNodeIds);

    return NextResponse.json({ runId: run.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to start workflow run" },
      { status: 500 }
    );
  }
}

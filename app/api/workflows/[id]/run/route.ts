import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getUserId } from "../../../../lib/auth-util";
import { tasks } from "@trigger.dev/sdk";
import { executeWorkflowTask } from "../../../../trigger/workflowExecutor";

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

    // 3. Trigger execution in background via Trigger.dev
    await tasks.trigger<typeof executeWorkflowTask>("execute-workflow-task", {
      runId: run.id,
      workflowId: id,
      userId,
      nodes,
      edges,
      runOnlyNodeIds,
    });

    return NextResponse.json({ runId: run.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to start workflow run" },
      { status: 500 }
    );
  }
}

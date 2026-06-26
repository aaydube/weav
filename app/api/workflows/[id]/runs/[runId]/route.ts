import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { getUserId } from "../../../../../lib/auth-util";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, runId } = await params;
    
    // Check ownership of workflow before returning run details
    const workflow = await db.getWorkflow(id, userId);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }

    const run = await db.getRun(runId);
    if (!run || run.workflowId !== id) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load run details" }, { status: 500 });
  }
}

// POST /api/workflows/[id]/runs/[runId] — Cancel a running execution
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, runId } = await params;

    // Verify the workflow belongs to this user
    const workflow = await db.getWorkflow(id, userId);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }

    // Mark the run as CANCELLED in the database
    const updated = await db.updateRun(runId, {
      status: "CANCELLED",
    });

    if (!updated) {
      // Run may not exist yet (started but not persisted) — still report success
      // so the frontend can clear its running state
      return NextResponse.json({ cancelled: true, runId });
    }

    return NextResponse.json({ cancelled: true, runId, run: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to cancel run" }, { status: 500 });
  }
}


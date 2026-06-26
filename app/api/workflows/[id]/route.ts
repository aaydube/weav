import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getUserId } from "../../../lib/auth-util";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const workflow = await db.getWorkflow(id, userId);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }
    return NextResponse.json(workflow);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load workflow" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const updated = await db.updateWorkflow(id, userId, body);
    if (!updated) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const deleted = await db.deleteWorkflow(id, userId);
    if (!deleted) {
      return NextResponse.json({ error: "Workflow not found or unauthorized" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete workflow" }, { status: 500 });
  }
}

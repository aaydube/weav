import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { getUserId } from "../../lib/auth-util";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workflows = await db.getWorkflows(userId);
    return NextResponse.json(workflows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load workflows" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const newWorkflow = await db.createWorkflow(name, userId);
    return NextResponse.json(newWorkflow);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create workflow" }, { status: 500 });
  }
}

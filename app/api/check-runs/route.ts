import { NextResponse } from "next/server";
import { getPrismaClient } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = getPrismaClient();
  if (!client) {
    return NextResponse.json({ error: "Prisma client not initialized" });
  }
  try {
    const workflows = await client.workflow.findMany({
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    const runs = await client.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const parsedWorkflow = workflows.length > 0 ? {
      id: workflows[0].id,
      name: workflows[0].name,
      nodes: JSON.parse(workflows[0].nodes),
      edges: JSON.parse(workflows[0].edges),
    } : null;

    const parsedRun = runs.length > 0 ? {
      id: runs[0].id,
      status: runs[0].status,
      logs: JSON.parse(runs[0].logs),
    } : null;

    return NextResponse.json({ workflow: parsedWorkflow, run: parsedRun });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack });
  }
}

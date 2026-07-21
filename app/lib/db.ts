import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// Lazy-loaded Prisma Client to prevent static page pre-rendering initialization side-effects
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (prisma) return prisma;
  
  const rawUrl = process.env.DATABASE_URL || "";
  const cleanUrl = rawUrl.replace(/['"]/g, "").trim();
  const isDbConfigured = !!cleanUrl && cleanUrl !== "";

  if (isDbConfigured) {
    try {
      const pool = new pg.Pool({ connectionString: cleanUrl });
      const adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });
      return prisma;
    } catch (e) {
      console.error("Prisma Client initialization error:", e);
    }
  }
  return null;
}

// Fallback JSON DB Configuration
const LOCAL_DB_PATH = path.join(process.cwd(), "local_db.json");

interface LocalDbSchema {
  workflows: any[];
  runs: any[];
}

class AsyncLock {
  private queue: Promise<any> = Promise.resolve();

  async acquire<T>(fn: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
}

const fileLock = new AsyncLock();

async function readLocalDb(): Promise<LocalDbSchema> {
  try {
    const data = await fs.promises.readFile(LOCAL_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      const initialData: LocalDbSchema = { workflows: [], runs: [] };
      await fs.promises.writeFile(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
      return initialData;
    }
    console.error("Error reading local db file, resetting it:", e);
    const initialData: LocalDbSchema = { workflows: [], runs: [] };
    await fs.promises.writeFile(LOCAL_DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
}

async function writeLocalDb(data: LocalDbSchema): Promise<void> {
  try {
    await fs.promises.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing local db file:", e);
  }
}


// Default pre-populated sample workflow data
const getSampleWorkflow = (userId: string = "default-user") => {
  const sampleNodes = [
    {
      id: "request-inputs",
      type: "requestInputs",
      position: { x: 100, y: 200 },
      data: {
        title: "Request Inputs",
        product_text: "Sleek wireless noise-canceling headphones with 40-hour battery life and spatial audio.",
        product_photo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
      },
    },
    {
      id: "crop-tight",
      type: "cropImage",
      position: { x: 450, y: 50 },
      data: {
        title: "Tight Crop (1:1)",
        aspectRatio: "1:1",
        cropType: "tight",
        croppedImage: null,
        cropped_image: null,
      },
    },
    {
      id: "crop-wide",
      type: "cropImage",
      position: { x: 450, y: 250 },
      data: {
        title: "Wide Crop (16:9)",
        aspectRatio: "16:9",
        cropType: "wide",
        croppedImage: null,
        cropped_image: null,
      },
    },
    {
      id: "gemini-desc",
      type: "geminiPro",
      position: { x: 450, y: 480 },
      data: {
        title: "Gemini: Write Description",
        prompt: "Write a detailed, premium product marketing description. Focus on the benefits of battery life and active noise cancellation. Details: {product_text}",
        model: "gemini-2.5-pro",
        temperature: 0.7,
        textOutput: "",
      },
    },
    {
      id: "gemini-tweet",
      type: "geminiPro",
      position: { x: 850, y: 480 },
      data: {
        title: "Gemini: Condense to Tweet",
        prompt: "Condense this description into a punchy Twitter post under 280 characters with relevant hashtags. Description: {long_description}",
        model: "gemini-2.5-flash",
        temperature: 0.5,
        textOutput: "",
      },
    },
    {
      id: "gemini-post",
      type: "geminiPro",
      position: { x: 1200, y: 250 },
      data: {
        title: "Gemini: Combine into Post",
        prompt: "Combine the following tweet: {tweet} and describe the two accompanying product shots ({cropped_image_1} and {cropped_image_2}) to form a cohesive, high-converting social media marketing post.",
        model: "gemini-2.5-pro",
        temperature: 0.7,
        textOutput: "",
      },
    },
    {
      id: "response-node",
      type: "responseNode",
      position: { x: 1550, y: 250 },
      data: {
        title: "Response Output",
        text: "",
        image_1: null,
        image_2: null,
      },
    },
  ];

  const sampleEdges = [
    {
      id: "e-photo-to-tight",
      source: "request-inputs",
      sourceHandle: "product_photo",
      target: "crop-tight",
      targetHandle: "image",
      type: "default",
    },
    {
      id: "e-photo-to-wide",
      source: "request-inputs",
      sourceHandle: "product_photo",
      target: "crop-wide",
      targetHandle: "image",
      type: "default",
    },
    {
      id: "e-text-to-desc",
      source: "request-inputs",
      sourceHandle: "product_text",
      target: "gemini-desc",
      targetHandle: "text",
      type: "default",
    },
    {
      id: "e-desc-to-tweet",
      source: "gemini-desc",
      sourceHandle: "output",
      target: "gemini-tweet",
      targetHandle: "text",
      type: "default",
    },
    {
      id: "e-tweet-to-post",
      source: "gemini-tweet",
      sourceHandle: "output",
      target: "gemini-post",
      targetHandle: "tweet",
      type: "default",
    },
    {
      id: "e-tight-to-post",
      source: "crop-tight",
      sourceHandle: "cropped_image",
      target: "gemini-post",
      targetHandle: "image_1",
      type: "default",
    },
    {
      id: "e-wide-to-post",
      source: "crop-wide",
      sourceHandle: "cropped_image",
      target: "gemini-post",
      targetHandle: "image_2",
      type: "default",
    },
    {
      id: "e-post-to-resp",
      source: "gemini-post",
      sourceHandle: "output",
      target: "response-node",
      targetHandle: "text",
      type: "default",
    },
    {
      id: "e-tight-to-resp",
      source: "crop-tight",
      sourceHandle: "cropped_image",
      target: "response-node",
      targetHandle: "image_1",
      type: "default",
    },
    {
      id: "e-wide-to-resp",
      source: "crop-wide",
      sourceHandle: "cropped_image",
      target: "response-node",
      targetHandle: "image_2",
      type: "default",
    },
  ];

  return {
    id: "sample-workflow-" + userId,
    name: "Product Launch Social Campaign",
    userId,
    nodes: JSON.stringify(sampleNodes),
    edges: JSON.stringify(sampleEdges),
    status: "IDLE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Database Layer API
export const db = {
  async getWorkflows(userId: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        let list = await client.workflow.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        return list;
      } catch (e) {
        console.error("Prisma error in getWorkflows, falling back to local file:", e);
      }
    }

    // JSON file fallback
    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      let userWorkflows = local.workflows.filter((w) => w.userId === userId);
      return [...userWorkflows].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  },

  async getWorkflow(id: string, userId: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        const wf = await client.workflow.findUnique({
          where: { id },
          include: { runs: { orderBy: { createdAt: "desc" } } },
        });
        if (wf) {
          if (wf.userId !== userId) return null;
          return wf;
        }
        if (id === "sample-workflow-" + userId) {
          const sample = getSampleWorkflow(userId);
          return await client.workflow.create({
            data: {
              id: sample.id,
              name: sample.name,
              userId: sample.userId,
              nodes: sample.nodes,
              edges: sample.edges,
              status: sample.status,
            },
            include: { runs: true },
          });
        }
        return null;
      } catch (e) {
        console.error(`Prisma error in getWorkflow(${id}), falling back:`, e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      let wf = local.workflows.find((w) => w.id === id);
      if (!wf && id === "sample-workflow-" + userId) {
        wf = getSampleWorkflow(userId);
        local.workflows.push(wf);
        await writeLocalDb(local);
      }
      if (wf) {
        if (wf.userId !== userId) return null;
        const runs = local.runs
          .filter((r) => r.workflowId === id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { ...wf, runs };
      }
      return null;
    });
  },

  async createWorkflow(name: string, userId: string) {
    const defaultNodes = [
      {
        id: "request-inputs",
        type: "requestInputs",
        position: { x: 100, y: 200 },
        data: {
          title: "Request Inputs",
          product_text: "",
          product_photo: null,
        },
      },
      {
        id: "response-node",
        type: "responseNode",
        position: { x: 1000, y: 200 },
        data: {
          title: "Response Output",
          text: "",
          image_1: null,
          image_2: null,
        },
      },
    ];
    const nodes = JSON.stringify(defaultNodes);
    const edges = JSON.stringify([]);
    const client = getPrismaClient();
    if (client) {
      try {
        return await client.workflow.create({
          data: { name, userId, nodes, edges, status: "IDLE" },
        });
      } catch (e) {
        console.error("Prisma error in createWorkflow, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      const newWf = {
        id: "wf_" + Math.random().toString(36).substring(2, 9),
        name,
        userId,
        nodes,
        edges,
        status: "IDLE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      local.workflows.push(newWf);
      await writeLocalDb(local);
      return newWf;
    });
  },

  async updateWorkflow(id: string, userId: string, data: { name?: string; nodes?: string; edges?: string; status?: string }) {
    const client = getPrismaClient();
    if (client) {
      try {
        const existing = await client.workflow.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;

        return await client.workflow.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
      } catch (e) {
        console.error("Prisma error in updateWorkflow, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      const idx = local.workflows.findIndex((w) => w.id === id);
      if (idx !== -1) {
        if (local.workflows[idx].userId !== userId) return null;
        const updated = {
          ...local.workflows[idx],
          ...data,
          updatedAt: new Date(),
        };
        local.workflows[idx] = updated;
        await writeLocalDb(local);
        return updated;
      }
      return null;
    });
  },

  async deleteWorkflow(id: string, userId: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        const existing = await client.workflow.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return false;

        await client.workflow.delete({ where: { id } });
        return true;
      } catch (e) {
        console.error("Prisma error in deleteWorkflow, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      const idx = local.workflows.findIndex((w) => w.id === id);
      if (idx !== -1) {
        if (local.workflows[idx].userId !== userId) return false;
        local.workflows = local.workflows.filter((w) => w.id !== id);
        local.runs = local.runs.filter((r) => r.workflowId !== id);
        await writeLocalDb(local);
        return true;
      }
      return false;
    });
  },

  async createRun(workflowId: string, status: string, duration: number, logs: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        return await client.run.create({
          data: {
            workflowId,
            status,
            duration,
            logs,
          },
        });
      } catch (e) {
        console.error("Prisma error in createRun, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      const newRun = {
        id: "run_" + Math.random().toString(36).substring(2, 9),
        workflowId,
        status,
        duration,
        logs,
        createdAt: new Date(),
      };
      local.runs.push(newRun);
      await writeLocalDb(local);
      return newRun;
    });
  },

  async updateRun(runId: string, data: { status?: string; duration?: number; logs?: string }) {
    const client = getPrismaClient();
    if (client) {
      try {
        return await client.run.update({
          where: { id: runId },
          data,
        });
      } catch (e) {
        console.error("Prisma error in updateRun, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      const idx = local.runs.findIndex((r: any) => r.id === runId);
      if (idx !== -1) {
        local.runs[idx] = { ...local.runs[idx], ...data };
        await writeLocalDb(local);
        return local.runs[idx];
      }
      return null;
    });
  },

  async getRuns(workflowId: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        return await client.run.findMany({
          where: { workflowId },
          orderBy: { createdAt: "desc" },
        });
      } catch (e) {
        console.error("Prisma error in getRuns, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      return local.runs
        .filter((r) => r.workflowId === workflowId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  },

  async getRun(runId: string) {
    const client = getPrismaClient();
    if (client) {
      try {
        return await client.run.findUnique({
          where: { id: runId },
        });
      } catch (e) {
        console.error("Prisma error in getRun, falling back:", e);
      }
    }

    return fileLock.acquire(async () => {
      const local = await readLocalDb();
      return local.runs.find((r: any) => r.id === runId) || null;
    });
  },
};

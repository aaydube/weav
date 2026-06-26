import { defineConfig } from "@prisma/config";

const rawUrl = process.env.DATABASE_URL || "";
const cleanUrl = rawUrl.replace(/['"]/g, "").trim();
const dbUrl = cleanUrl !== "" ? cleanUrl : "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  engine: "classic",
  datasource: {
    url: dbUrl,
  },
});

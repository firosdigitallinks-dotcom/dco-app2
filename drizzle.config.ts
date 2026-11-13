import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./mysql/migrations",
  schema: "./db/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "hygiene_links",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hygiene_links",
  },
});

import { defineConfig } from "drizzle-kit";

/**
 * Reads DATABASE_URL from the environment (.env locally, shell or CI remotely),
 * so the same config can push the schema to a local database or a hosted one:
 *
 *   DATABASE_URL="postgres://…?sslmode=require" npx drizzle-kit push
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});

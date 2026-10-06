import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL is required to generate or apply the Supabase schema");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/supabase-migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});

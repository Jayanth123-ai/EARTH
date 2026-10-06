import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import { users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { SUPABASE_ROOT_CA } from "./supabase-ca";
import { normalizeSupabaseConnectionString } from "./supabase-connection";

let _db: PostgresJsDatabase<typeof schema> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

/** Supabase is authoritative after cutover. DATABASE_URL remains only as the preserved MySQL backup. */
export async function getDb() {
  if (!_db && process.env.SUPABASE_DATABASE_URL) {
    try {
      const connectionString = normalizeSupabaseConnectionString(process.env.SUPABASE_DATABASE_URL);
      _client = postgres(connectionString, {
        max: 5,
        connect_timeout: 10,
        idle_timeout: 20,
        prepare: false,
        ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
      });
      _db = drizzle(_client, { schema });
    } catch (error) {
      console.warn("[Database] Supabase initialization failed:", error instanceof Error ? error.message : "connection failed");
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: Supabase database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Partial<InsertUser> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  updateSet.updatedAt = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
  return result[0];
}

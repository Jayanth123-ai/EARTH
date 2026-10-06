import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { SUPABASE_ROOT_CA } from "./supabase-ca";
import { normalizeSupabaseConnectionString } from "./supabase-connection";

const rawConnectionString = process.env.SUPABASE_DATABASE_URL ?? "";
const enabled = process.env.EARTH616_SUPABASE_SMOKE_TEST === "1" && rawConnectionString.length > 0;
const connectionString = enabled ? normalizeSupabaseConnectionString(rawConnectionString) : "";
const client = enabled
  ? postgres(connectionString, {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 1,
      prepare: false,
      ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
    })
  : null;

afterAll(async () => {
  if (client) await client.end({ timeout: 5 });
});

describe.skipIf(!enabled)("EARTH616 Supabase database secret", () => {
  it("authenticates and runs a lightweight query without printing credentials", async () => {
    const parsed = new URL(connectionString);
    expect(["postgres:", "postgresql:"]).toContain(parsed.protocol);
    expect(parsed.hostname).toMatch(/\.supabase\.(co|com)$/);
    expect(parsed.username).toBe("postgres.uysqituonidopqzqomfk");
    expect(parsed.password).not.toBe("");
    expect([null, "require", "verify-ca", "verify-full"]).toContain(parsed.searchParams.get("sslmode"));
    expect(client).not.toBeNull();
    const rows = await client!`SELECT 1 AS ok`;
    expect(Number(rows[0]?.ok)).toBe(1);
  });
});

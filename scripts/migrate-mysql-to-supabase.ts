import mysql from "mysql2/promise";
import postgres from "postgres";
import { SUPABASE_ROOT_CA } from "../server/supabase-ca";
import { normalizeSupabaseConnectionString } from "../server/supabase-connection";

const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.SUPABASE_DATABASE_URL;
if (!sourceUrl || !targetUrl) throw new Error("Both database connection secrets must be configured.");

const tableNames = [
  "users", "profiles", "territories", "territory_owners", "wallet_accounts",
  "wallet_transactions", "wallet_topup_requests", "orders", "payments",
  "achievements", "user_achievements", "notifications", "activity_logs", "admin_logs",
] as const;
type TableName = (typeof tableNames)[number];
const copyColumns: Record<"users" | "profiles", readonly string[]> = {
  users: ["id", "openId", "name", "email", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn"],
  profiles: ["userId", "identityId", "username", "displayName", "avatarUrl", "bio", "identityLevel", "territoryPower", "territoryCount", "createdAt", "updatedAt"],
};
const quoteIdentifier = (value: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error("Unexpected identifier in migration allowlist.");
  return `"${value}"`;
};

const source = await mysql.createConnection({ uri: sourceUrl, timezone: "Z" });
const target = postgres(normalizeSupabaseConnectionString(targetUrl), {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 1,
  prepare: false,
  ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
});

function safeCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("A table count could not be safely verified.");
  return count;
}

try {
  await source.query("SET time_zone = '+00:00'");
  const sourceCounts = {} as Record<TableName, number>;
  for (const table of tableNames) {
    const [rows] = await source.query(`SELECT COUNT(*) AS total FROM \`${table}\` LIMIT 1`);
    sourceCounts[table] = safeCount((rows as Array<{ total: unknown }>)[0]?.total);
  }

  const notCopyable = tableNames.filter(table => table !== "users" && table !== "profiles" && sourceCounts[table] !== 0);
  if (notCopyable.length > 0) {
    throw new Error(`Source contains rows in additional tables; stop for a full table migration: ${notCopyable.join(", ")}`);
  }

  const targetCounts = {} as Record<TableName, number>;
  for (const table of tableNames) {
    const rows = await target.unsafe<{ total: string }[]>(`SELECT COUNT(*) AS total FROM public.${quoteIdentifier(table)} LIMIT 1`);
    targetCounts[table] = safeCount(rows[0]?.total);
  }
  if (tableNames.some(table => targetCounts[table] !== 0)) {
    throw new Error("Supabase target was not empty before migration; stop and reconcile before writing.");
  }

  const copied = await target.begin(async tx => {
    const sourceRows: Record<"users" | "profiles", Array<Record<string, unknown>>> = {
      users: [], profiles: [],
    };
    for (const table of ["users", "profiles"] as const) {
      const [rows] = await source.query(`SELECT * FROM \`${table}\` LIMIT 1000`);
      sourceRows[table] = rows as Array<Record<string, unknown>>;
      if (sourceRows[table].length !== sourceCounts[table]) {
        throw new Error(`Source row count changed during migration for ${table}.`);
      }
      const columns = copyColumns[table];
      const columnSql = columns.map(quoteIdentifier).join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const statement = `INSERT INTO public.${quoteIdentifier(table)} (${columnSql}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      for (const row of sourceRows[table]) {
        await tx.unsafe(statement, columns.map(column => row[column] ?? null));
      }
    }

    const targetUserCount = await tx.unsafe<{ total: string }[]>(`SELECT COUNT(*) AS total FROM public."users" LIMIT 1`);
    const targetProfileCount = await tx.unsafe<{ total: string }[]>(`SELECT COUNT(*) AS total FROM public."profiles" LIMIT 1`);
    const userCount = safeCount(targetUserCount[0]?.total);
    const profileCount = safeCount(targetProfileCount[0]?.total);
    if (userCount !== sourceCounts.users || profileCount !== sourceCounts.profiles) {
      throw new Error("Post-migration row counts do not match; transaction rolled back.");
    }

    if (userCount > 0) {
      await tx`SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT MAX("id") FROM public."users"), true)`;
    }
    return { users: userCount, profiles: profileCount };
  });

  console.log(JSON.stringify({ copied, sourceRows: { users: sourceCounts.users, profiles: sourceCounts.profiles }, untouchedEmptyTables: notCopyable.length === 0 }, null, 2));
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  console.error("Supabase data migration stopped safely.", code ? `Database error code: ${code}` : "Review the non-sensitive diagnostic message.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([source.end(), target.end({ timeout: 5 })]);
}

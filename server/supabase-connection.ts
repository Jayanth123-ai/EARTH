export const SUPABASE_PROJECT_REF = "uysqituonidopqzqomfk";

/** Supavisor's session pooler expects `postgres.<project-ref>` as the user. */
export function normalizeSupabaseConnectionString(raw: string): string {
  const url = new URL(raw);
  if (url.hostname.endsWith(".pooler.supabase.com") && url.username === "postgres") {
    url.username = `postgres.${SUPABASE_PROJECT_REF}`;
  }
  return url.toString();
}

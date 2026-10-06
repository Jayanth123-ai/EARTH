import { count } from "drizzle-orm";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Supabase adapter unavailable.");
  const migratedUsers = await db.select().from(users).limit(2);
  if (migratedUsers.length !== 1 || migratedUsers[0]?.role !== "admin") {
    throw new Error("Expected the single migrated admin account before running the read-only smoke test.");
  }

  const req = { protocol: "https", headers: {} } as TrpcContext["req"];
  const res = { clearCookie: () => undefined } as unknown as TrpcContext["res"];
  const caller = appRouter.createCaller({ user: migratedUsers[0], req, res });

  const [catalog, rankings, profile, dashboard, wallet, topups, notifications, overview, report, audit, adminTopups, adminUsers, adminTerritories, adminOrders, adminPayments, ledger] = await Promise.all([
    caller.territories.list({}),
    caller.territories.rankings({ category: "power", limit: 10 }),
    caller.account.profile.me(),
    caller.account.dashboard.summary(),
    caller.account.wallet.summary(),
    caller.account.wallet.topups.list(),
    caller.account.notifications.list(),
    caller.admin.overview(),
    caller.admin.reports(),
    caller.admin.audit(),
    caller.admin.walletTopups.list(),
    caller.admin.users(),
    caller.admin.territories(),
    caller.admin.orders(),
    caller.admin.payments(),
    caller.admin.ledger(),
  ]);

  const userCount = await db.select({ total: count() }).from(users);
  console.log(JSON.stringify({
    supabaseAdapter: "connected",
    migratedAdminCount: Number(userCount[0]?.total ?? 0),
    profileLoaded: Boolean(profile.identityId),
    dashboardLoaded: true,
    walletHistoryRows: wallet.transactions.length,
    submittedTopupRows: topups.length,
    notificationRows: notifications.length,
    publicCatalogRows: catalog.items.length,
    publicRankingRows: rankings.entries.length,
    adminOverviewLoaded: typeof overview.users === "number",
    adminReportsLoaded: Boolean(report),
    adminAuditRows: audit.length,
    adminTopupReviewRows: adminTopups.length,
    adminUsersRows: adminUsers.length,
    adminTerritoryRows: adminTerritories.length,
    adminOrderRows: adminOrders.length,
    adminPaymentRows: adminPayments.length,
    adminLedgerRows: ledger.length,
  }, null, 2));
}

main().catch(() => {
  console.error("Supabase application smoke check failed; no user or payment data was logged.");
  process.exitCode = 1;
});

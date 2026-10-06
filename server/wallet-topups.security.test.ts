import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeUser(role: "user" | "admin" = "user"): NonNullable<TrpcContext["user"]> {
  return {
    id: role === "admin" ? 2 : 1,
    openId: `${role}-wallet-test`,
    email: `${role}@example.test`,
    name: role === "admin" ? "Admin Test" : "Wallet Test",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("wallet top-up authorization and input safety", () => {
  it("requires a signed-in user to submit a payment claim", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.account.wallet.topups.submit({ amount: 50, paymentReference: "pay_test123" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not allow a regular account to view or approve top-up claims", async () => {
    const caller = appRouter.createCaller(createContext(makeUser("user")));
    await expect(caller.admin.walletTopups.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.walletTopups.review({ requestId: "00000000-0000-4000-8000-000000000001", decision: "REJECT" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires the post-payment receipt URL the user needs to submit", async () => {
    const caller = appRouter.createCaller(createContext(makeUser("user")));
    await expect(caller.account.wallet.topups.submit({
      amount: 50,
      paymentReference: "pay_test123",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects non-HTTPS receipt URLs before any database operation", async () => {
    const caller = appRouter.createCaller(createContext(makeUser("user")));
    await expect(caller.account.wallet.topups.submit({
      amount: 50,
      paymentReference: "pay_test124",
      receiptUrl: "http://example.test/receipt",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires an official Razorpay payment ID before an admin can approve a claim", async () => {
    const caller = appRouter.createCaller(createContext(makeUser("admin")));
    await expect(caller.admin.walletTopups.review({
      requestId: "00000000-0000-4000-8000-000000000001",
      decision: "VERIFY",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

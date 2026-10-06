import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("server authorization and input validation", () => {
  it("denies non-admin users access to payment records before querying the database", async () => {
    const user = {
      id: 1,
      openId: "regular-user",
      email: "regular@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(createContext(user));

    await expect(caller.admin.payments()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid public price filters before hitting the catalog database", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.territories.list({ maxPrice: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

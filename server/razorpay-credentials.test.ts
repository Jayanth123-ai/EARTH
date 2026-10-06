import { describe, expect, it } from "vitest";

const keyId = process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
const credentialsAvailable = /^rzp_test_[A-Za-z0-9]+$/.test(keyId) && keySecret.length >= 16;

describe.skipIf(!credentialsAvailable)("Razorpay test credentials", () => {
  it("authenticate against Razorpay's read-only payments endpoint", async () => {
    const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const response = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      method: "GET",
      headers: { Authorization: authorization, Accept: "application/json" },
    });
    expect(response.ok).toBe(true);
  });
});

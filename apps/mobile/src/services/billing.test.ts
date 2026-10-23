import { describe, expect, it } from "vitest";
import { hasPaidAccess, PaymentRequiredError, purchaseMembership, requirePaidAccess, restoreMembership } from "./billing";

describe("payment boundary before service integration", () => {
  it("never grants access locally", () => {
    expect(hasPaidAccess()).toBe(false);
    expect(() => requirePaidAccess()).toThrow(PaymentRequiredError);
  });
  it.each(["annual", "monthly"] as const)("does not turn a %s purchase into an entitlement", async (plan) => {
    await expect(purchaseMembership(plan)).rejects.toThrow("not been charged");
    expect(hasPaidAccess()).toBe(false);
  });
  it("does not grant access through restore", async () => {
    await expect(restoreMembership()).rejects.toThrow("not available");
    expect(hasPaidAccess()).toBe(false);
  });
});

/** No local flag, URL parameter, or purchase button can grant paid access. */
export function hasPaidAccess(): boolean {
  // Fail closed until store purchases and server verification are connected.
  return false;
}

export class PaymentRequiredError extends Error {
  constructor() {
    super("A verified Solyne membership is required. Purchases are not available in this build.");
    this.name = "PaymentRequiredError";
  }
}

export function requirePaidAccess(): void {
  if (!hasPaidAccess()) throw new PaymentRequiredError();
}

export type PlanId = "annual" | "monthly";

// Pricing hypotheses for design review, never used as store prices or a charge.
export const DESIGN_PLANS = [
  { id: "annual", name: "Yearly", price: "$29.99", period: "year", detail: "About $2.50 / month", badge: "Best value" },
  { id: "monthly", name: "Monthly", price: "$5.99", period: "month", detail: "Billed monthly", badge: null },
] as const;

export async function purchaseMembership(_plan: PlanId): Promise<never> {
  throw new Error("Purchases are not available yet. You have not been charged.");
}

export async function restoreMembership(): Promise<never> {
  throw new Error("Restore is not available yet. Once purchases are connected, use the store account you subscribed with.");
}

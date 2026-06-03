// Focus Academy course pricing — single source of truth.
// Edit these constants here only; never hardcode in components.

export const COURSE_NAME = "Stock Market Pro";

export const BASE_PRICE = 20000;
export const VAT_RATE = 0.13;
export const VAT_AMOUNT = Math.round(BASE_PRICE * VAT_RATE); // 2,600

export const FULL_TOTAL = BASE_PRICE + VAT_AMOUNT;            // 22,600
export const INSTALLMENT_SURCHARGE = 500;                     // flat
export const INSTALLMENT_TOTAL = FULL_TOTAL + INSTALLMENT_SURCHARGE; // 23,100
export const DEFAULT_INSTALLMENT_COUNT = 2;
export const INSTALLMENT_AMOUNT = INSTALLMENT_TOTAL / DEFAULT_INSTALLMENT_COUNT; // 11,550

// Legacy aliases kept for any existing imports.
export const FULL_PRICE = FULL_TOTAL;

export type PaymentPlan = "full" | "installment";

export const expectedTotal = (plan: PaymentPlan): number =>
  plan === "installment" ? INSTALLMENT_TOTAL : FULL_TOTAL;

export const expectedPerInstallment = (plan: PaymentPlan, n: number): number => {
  if (plan === "full") return FULL_TOTAL;
  const count = Math.max(1, n || DEFAULT_INSTALLMENT_COUNT);
  return Math.round((INSTALLMENT_TOTAL / count) * 100) / 100;
};

// Backwards-compat helpers used elsewhere in the app.
export const totalForPlan = (plan: PaymentPlan) => expectedTotal(plan);
export const amountDueNow = (plan: PaymentPlan, _installmentNumber: number) =>
  plan === "full" ? FULL_TOTAL : INSTALLMENT_AMOUNT;

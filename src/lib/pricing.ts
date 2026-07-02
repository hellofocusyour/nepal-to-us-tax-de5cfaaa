// Focus Academy course pricing — single source of truth.
// Flat NPR 20,000 all-inclusive. No VAT, no installment surcharge.

export const COURSE_NAME = "US Tax Preparer — 30 Day Program";

export const BASE_PRICE = 20000;
export const VAT_RATE = 0;
export const VAT_AMOUNT = 0;

export const FULL_TOTAL = BASE_PRICE;              // 20,000
export const INSTALLMENT_SURCHARGE = 0;            // no surcharge
export const INSTALLMENT_TOTAL = FULL_TOTAL;       // 20,000
export const DEFAULT_INSTALLMENT_COUNT = 2;
export const INSTALLMENT_AMOUNT = INSTALLMENT_TOTAL / DEFAULT_INSTALLMENT_COUNT; // 10,000

// Legacy aliases kept for existing imports.
export const FULL_PRICE = FULL_TOTAL;

export type PaymentPlan = "full" | "installment";

export const expectedTotal = (_plan: PaymentPlan): number => FULL_TOTAL;

export const expectedPerInstallment = (plan: PaymentPlan, n: number): number => {
  if (plan === "full") return FULL_TOTAL;
  const count = Math.max(1, n || DEFAULT_INSTALLMENT_COUNT);
  return Math.round((INSTALLMENT_TOTAL / count) * 100) / 100;
};

export const totalForPlan = (plan: PaymentPlan) => expectedTotal(plan);
export const amountDueNow = (plan: PaymentPlan, _installmentNumber: number) =>
  plan === "full" ? FULL_TOTAL : INSTALLMENT_AMOUNT;

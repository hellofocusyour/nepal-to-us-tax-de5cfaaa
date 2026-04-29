// Hard-coded pricing for "Stock Market Pro" (incl. 13% VAT)
export const COURSE_NAME = "Stock Market Pro";
export const VAT_RATE = 0.13;
export const BASE_PRICE = 20000;
export const FULL_PRICE = 22600; // 20,000 + 13% VAT
export const INSTALLMENT_SURCHARGE = 500;
export const INSTALLMENT_TOTAL = 23100; // 22,600 + 500 surcharge
export const INSTALLMENT_AMOUNT = 11550; // each of 2

export type PaymentPlan = "full" | "installment";

export const totalForPlan = (plan: PaymentPlan) =>
  plan === "installment" ? INSTALLMENT_TOTAL : FULL_PRICE;

export const amountDueNow = (plan: PaymentPlan, installmentNumber: number) => {
  if (plan === "full") return FULL_PRICE;
  return INSTALLMENT_AMOUNT;
};

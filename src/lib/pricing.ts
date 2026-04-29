// Hard-coded pricing for "Stock Market Pro"
export const COURSE_NAME = "Stock Market Pro";
export const FULL_PRICE = 20000;
export const INSTALLMENT_TOTAL = 20500;
export const INSTALLMENT_SURCHARGE = 500;
export const INSTALLMENT_AMOUNT = 10250; // each of 2

export type PaymentPlan = "full" | "installment";

export const totalForPlan = (plan: PaymentPlan) =>
  plan === "installment" ? INSTALLMENT_TOTAL : FULL_PRICE;

export const amountDueNow = (plan: PaymentPlan, installmentNumber: number) => {
  if (plan === "full") return FULL_PRICE;
  return INSTALLMENT_AMOUNT;
};

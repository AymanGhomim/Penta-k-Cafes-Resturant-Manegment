import type { OrderSource, OrderType, PaymentMethod } from "@/types/order.types";

export type ReportFilters = {
  from?: string;
  to?: string;
  branchIds?: string[];
  orderType?: OrderType;
  orderSource?: OrderSource;
  paymentMethod?: PaymentMethod;
  allowedBranchIds?: string[];
};

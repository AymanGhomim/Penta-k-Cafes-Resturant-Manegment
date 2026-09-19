export type OperationResource =
  | "inventory"
  | "stockMovements"
  | "stockCounts"
  | "waste"
  | "recipes"
  | "suppliers"
  | "purchases"
  | "expenses"
  | "customers"
  | "loyalty"
  | "coupons"
  | "deliveryZones"
  | "payments"
  | "refunds"
  | "cashRegister"
  | "shifts"
  | "notifications"
  | "waiterRequests"
  | "modifierGroups"
  | "loyaltySettings"
  | "auditLog";
export type OperationRecord = {
  id: string;
  tenantId?: string;
  branchId?: string;
  [key: string]: unknown;
};
export type InventoryItem = OperationRecord & {
  name: string;
  sku?: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  averageCost: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
export type StockMovement = OperationRecord & {
  inventoryItemId: string;
  type: "PURCHASE" | "SALE" | "WASTE" | "ADJUSTMENT" | "RETURN" | "ORDER_CANCELLATION_RESTORE";
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
};
export type WasteRecord = OperationRecord & {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  reason: string;
  notes?: string;
  createdAt: string;
};
export type Recipe = OperationRecord & {
  productId: string;
  ingredients: { inventoryItemId: string; quantity: number; unit: string }[];
};
export type Purchase = OperationRecord & {
  invoiceNumber: string;
  supplierId: string;
  date: string;
  items: {
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
};
export type AuditEntry = OperationRecord & {
  userId?: string;
  module: string;
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
};
export type PaymentRecord = OperationRecord & {
  transactionNumber?: string;
  orderId: string;
  customerId?: string;
  employeeId?: string;
  amount: number;
  method: "CASH" | "CARD" | "WALLET" | "ONLINE" | "MIXED";
  allocations?: {
    method: "CASH" | "CARD" | "WALLET" | "ONLINE";
    amount: number;
  }[];
  receivedAmount?: number;
  changeAmount?: number;
  status: "PAID" | "PENDING" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED";
  transactionReference?: string;
  refundAmount?: number;
  orderNumber?: string;
  customerName?: string;
  orderTotal?: number;
  createdAt: string;
};
export type RefundRecord = OperationRecord & {
  orderId: string;
  paymentId: string;
  amount: number;
  type: "FULL" | "PARTIAL";
  reason: string;
  employeeId?: string;
  createdAt: string;
};
export type CashRegisterEntry = OperationRecord & {
  type:
    | "OPENING_BALANCE"
    | "CASH_SALE"
    | "CASH_IN"
    | "CASH_OUT"
    | "EXPENSE"
    | "REFUND"
    | "SHIFT_ADJUSTMENT";
  amount: number;
  reason?: string;
  orderId?: string;
  paymentId?: string;
  refundId?: string;
  expenseId?: string;
  shiftId?: string;
  employeeId?: string;
  createdAt: string;
};
export type Shift = OperationRecord & {
  employeeId: string;
  openingCash: number;
  openedAt: string;
  status: "OPEN" | "CLOSED";
  closedAt?: string;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
};
export type Customer = OperationRecord & {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  addresses?: CustomerAddress[];
  active: boolean;
  createdAt: string;
};
export type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  notes?: string;
  phone?: string;
  isDefault: boolean;
};
export type Supplier = OperationRecord & {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
};
export type Expense = OperationRecord & {
  category: string;
  amount: number;
  date: string;
  notes?: string;
  employeeId?: string;
  paymentMethod?: "CASH" | "CARD" | "WALLET" | "ONLINE";
  attachment?: { name: string; type?: string; size?: number };
  createdAt: string;
};
export type DeliveryZone = OperationRecord & {
  name: string;
  fee: number;
  minimumOrder?: number;
  estimatedMinutes?: number;
  active: boolean;
};
export type Coupon = OperationRecord & {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minimumOrder?: number;
  maximumDiscount?: number;
  startDate?: string;
  endDate?: string;
  productIds?: string[];
  categoryIds?: string[];
  usageLimit?: number;
  perCustomerLimit?: number;
  usageCount?: number;
  usages?: { orderId: string; customerId?: string; usedAt: string }[];
  active: boolean;
};
export type StockCount = OperationRecord & {
  number: string;
  items: {
    inventoryItemId: string;
    expectedQuantity: number;
    actualQuantity: number;
  }[];
  status: "DRAFT" | "CONFIRMED";
  createdAt: string;
  confirmedAt?: string;
};
export type LoyaltySettings = OperationRecord & {
  enabled: boolean;
  spendAmountPerPoint: number;
  pointRedemptionValue: number;
  minimumRedeemPoints: number;
  maximumRedemptionAmount?: number;
  expiryDays?: number;
  updatedAt: string;
};
export type LoyaltyTransaction = OperationRecord & {
  customerId: string;
  orderId?: string;
  points: number;
  type: "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRED";
  notes?: string;
  createdAt: string;
};
export type WaiterRequest = OperationRecord & {
  tableId: string;
  tableNumber?: number;
  type: "WAITER" | "BILL" | "TISSUES" | "HELP" | "OTHER";
  status: "NEW" | "ACCEPTED" | "COMPLETED";
  notes?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
};
export type NotificationRecord = OperationRecord & {
  type:
    | "NEW_ORDER"
    | "QR_ORDER"
    | "WAITER_REQUEST"
    | "BILL_REQUEST"
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "KITCHEN_DELAY"
    | "SHIFT_DIFFERENCE"
    | "PAYMENT_FAILED"
    | "REFUND";
  title: string;
  message: string;
  read: boolean;
  relatedEntityType?:
    "order" | "table" | "waiterRequest" | "payment" | "inventory";
  relatedEntityId?: string;
  createdAt: string;
};
export type ModifierOption = {
  id: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
  sortOrder?: number;
};
export type ModifierGroup = OperationRecord & {
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  productIds: string[];
  options: ModifierOption[];
  active: boolean;
  sortOrder?: number;
};

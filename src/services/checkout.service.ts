import { branchService } from "@/services/branch.service";
import { tenantService } from "@/services/tenant.service";
import { roundMoney } from "@/lib/money";
import type { CartItem } from "@/types/cart.types";
import type {
  PaymentRecord,
} from "@/types/cafe-operations.types";
import type {
  Order,
  OrderItem,
  OrderType,
  PaymentMethod,
} from "@/types/order.types";
import { orderApiService } from "@/services/order-api.service";
import { paymentApiService } from "@/services/payment-api.service";
import { customerLoyaltyApiService } from "@/services/customer-loyalty-api.service";

export type CheckoutInput = {
  items: CartItem[];
  orderType: OrderType;
  tableId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerNotes?: string;
  deliveryZoneId?: string;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  paymentAllocations?: PaymentRecord["allocations"];
  receivedAmount?: number;
  source?: Order["source"];
  expectedTenantId?: string;
  expectedBranchId?: string;
  deferPayment?: boolean;
};
export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  deliveryFee: number;
  total: number;
};

function apiItem(item: OrderItem) {
  return { productId: item.productId, productName: item.productName, unitPrice: item.unitPrice, quantity: item.quantity, notes: item.notes };
}

function activeContext() {
  const tenantId = tenantService.requireActiveTenantId();
  const branchId = branchService.getActiveBranchId(tenantId);
  if (!branchId) throw new Error("أضف فرعًا أولًا لبدء إنشاء الطلبات.");
  const branch = branchService.getBranch(branchId, tenantId);
  if (!branch || branch.status !== "ACTIVE")
    throw new Error("الفرع الحالي غير صالح أو غير نشط.");
  return { tenantId, branchId, branch };
}

export const checkoutService = {
  calculate(
    items: CartItem[],
    couponCode?: string,
    customerId?: string,
  ): { items: OrderItem[]; totals: CheckoutTotals } {
    activeContext();
    if (!items.length) throw new Error("السلة فارغة.");
    const catalog = new Map<string, { id: string; name: string; price: number; isAvailable: boolean }>();
    const orderItems = items.map((cart, index) => {
      const product = catalog.get(cart.productId) ?? {
        id: cart.productId,
        name: cart.name,
        price: cart.price,
        isAvailable: true,
      };
      if (!product?.isAvailable)
        throw new Error(`المنتج ${cart.name} غير متاح في منيو الفرع.`);
      const addons = cart.addons ?? [];
      const selectedModifiers = cart.selectedModifiers ?? [];
      const unitPrice = roundMoney(
        product.price +
          Number(cart.variantPrice ?? 0) +
          addons.reduce((sum, addon) => sum + addon.price, 0) +
          selectedModifiers.reduce(
            (sum, modifier) => sum + modifier.priceAdjustment,
            0,
          ),
      );
      return {
        id: `order-item-${Date.now()}-${index}`,
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: cart.quantity,
        totalPrice: roundMoney(unitPrice * cart.quantity),
        notes: cart.notes,
        variantName: cart.variantName,
        addons,
        selectedModifiers,
      };
    });
    const subtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + item.totalPrice, 0),
    );
    // Coupon validation, tax, service charge, and delivery fees are calculated transactionally by the API.
    void couponCode;
    void customerId;
    const discount = 0;
    const tax = 0;
    const serviceCharge = 0;
    const deliveryFee = 0;
    const total = roundMoney(
      subtotal - discount + tax + serviceCharge + deliveryFee,
    );
    return {
      items: orderItems,
      totals: { subtotal, discount, tax, serviceCharge, deliveryFee, total },
    };
  },
  async createQuickCustomer(value: {
    name: string;
    phone?: string;
    address?: string;
  }) {
    if (!value.name.trim()) throw new Error("اسم العميل مطلوب.");
    return customerLoyaltyApiService.createCustomer({ ...value, email: "" });
  },
  async checkoutRemote(input: CheckoutInput) {
    const { tenantId, branchId } = activeContext();
    if (input.expectedTenantId && input.expectedTenantId !== tenantId) throw new Error("سياق الكافيه غير صحيح.");
    if (input.expectedBranchId && input.expectedBranchId !== branchId) throw new Error("سياق الفرع غير صحيح.");
    const { items, totals } = this.calculate(input.items, input.couponCode, input.customerId);
    const order = await orderApiService.create({ branchId, orderType: input.orderType, source: input.source ?? "POS", tableNumber: undefined, customerId: input.customerId, couponCode: input.couponCode, deliveryZoneId: input.deliveryZoneId, customerName: input.customerName, customerPhone: input.customerPhone, customerAddress: input.customerAddress, customerNotes: input.customerNotes, discount: totals.discount, tax: totals.tax, serviceCharge: totals.serviceCharge, deliveryFee: totals.deliveryFee, paymentMethod: input.paymentMethod, paymentStatus: input.deferPayment ? "PENDING" : "PAID", items: items.map(apiItem) });
    if (!input.deferPayment) await paymentApiService.create({ orderId: order.id, amount: order.total, method: input.paymentMethod });
    return { order };
  },
};

import { branchService } from "@/services/branch.service";
import { cafeDataService } from "@/services/cafe-data.service";
import { cafeOperationsService } from "@/services/cafe-operations.service";
import { tenantService } from "@/services/tenant.service";
import { percentageOf, roundMoney } from "@/lib/money";
import type { CartItem } from "@/types/cart.types";
import type {
  Coupon,
  Customer,
  DeliveryZone,
  InventoryItem,
  PaymentRecord,
  Recipe,
  StockMovement,
  NotificationRecord,
} from "@/types/cafe-operations.types";
import type {
  Order,
  OrderItem,
  OrderType,
  PaymentMethod,
} from "@/types/order.types";
import { hasTenantFeature } from "@/config/feature-access.config";
import { convertInventoryQuantity } from "@/lib/inventory-units";
import { validateCoupon, customerService } from "@/services/customer.service";
import { financeService } from "@/services/finance.service";
import { useAuthStore } from "@/store/auth.store";
import { orderApiService } from "@/services/order-api.service";
import { paymentApiService } from "@/services/payment-api.service";

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
  if (!branch.menuId) throw new Error("يجب تعيين منيو للفرع قبل إنشاء الطلب.");
  return { tenantId, branchId, branch };
}

function inventoryConsumptionEnabled(tenantId?: string) {
  if (!tenantId) return false;
  const tenant = tenantService.getTenant(tenantId);
  if (!tenant) return false;
  return hasTenantFeature(tenant, "inventory");
}

function getInventoryRequirements(
  order: Order,
  recipes: Recipe[],
  inventory: InventoryItem[],
) {
  const requirements = new Map<string, number>();
  order.items.forEach((orderItem) => {
    const recipe = recipes.find(
      (entry) => entry.productId === orderItem.productId,
    );
    recipe?.ingredients.forEach((ingredient) => {
      const inventoryItem = inventory.find(
        (entry) => entry.id === ingredient.inventoryItemId,
      );
      if (!inventoryItem)
        throw new Error("أحد مكونات الوصفة غير موجود في مخزون الفرع.");
      const normalized = convertInventoryQuantity(
        ingredient.quantity,
        ingredient.unit,
        inventoryItem.unit,
      );
      requirements.set(
        ingredient.inventoryItemId,
        (requirements.get(ingredient.inventoryItemId) ?? 0) +
          normalized * orderItem.quantity,
      );
    });
  });
  return requirements;
}

export const checkoutService = {
  calculate(
    items: CartItem[],
    couponCode?: string,
    deliveryZoneId?: string,
    customerId?: string,
  ): { items: OrderItem[]; totals: CheckoutTotals; coupon?: Coupon } {
    const { tenantId } = activeContext();
    if (!items.length) throw new Error("السلة فارغة.");
    const catalog = new Map(
      [
        ...branchService.getBranchProducts(undefined, tenantId),
        ...cafeDataService.getOffers().filter((offer) => offer.isActive).map((offer) => ({
          id: offer.id,
          name: offer.title,
          price: offer.price,
          isAvailable: offer.isActive,
        })),
      ].map((product) => [product.id, product]),
    );
    const orderItems = items.map((cart, index) => {
      const product = catalog.get(cart.productId);
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
    const couponResult = couponCode
      ? validateCoupon({
          code: couponCode,
          subtotal,
          items: orderItems,
          customerId,
        })
      : undefined;
    if (couponResult && !couponResult.valid)
      throw new Error(couponResult.message);
    const coupon = couponResult?.valid ? couponResult.coupon : undefined;
    const discount = couponResult?.valid ? couponResult.discount : 0;
    const settings = cafeDataService.getSettings();
    const tax = percentageOf(subtotal - discount, settings.taxRate);
    const serviceCharge = percentageOf(
      subtotal - discount,
      settings.serviceCharge,
    );
    const zone = deliveryZoneId
      ? cafeOperationsService
          .get<DeliveryZone>("deliveryZones")
          .find((item) => item.id === deliveryZoneId && item.active)
      : undefined;
    if (deliveryZoneId && !zone) throw new Error("منطقة التوصيل غير صالحة.");
    const deliveryFee = roundMoney(Number(zone?.fee ?? 0));
    const total = roundMoney(
      subtotal - discount + tax + serviceCharge + deliveryFee,
    );
    return {
      items: orderItems,
      totals: { subtotal, discount, tax, serviceCharge, deliveryFee, total },
      coupon,
    };
  },
  createQuickCustomer(value: {
    name: string;
    phone?: string;
    address?: string;
  }) {
    if (!value.name.trim()) throw new Error("اسم العميل مطلوب.");
    return cafeOperationsService.create<Customer>("customers", {
      ...value,
      active: true,
      createdAt: new Date().toISOString(),
    });
  },
  async checkoutRemote(input: CheckoutInput) {
    const { tenantId, branchId } = activeContext();
    if (input.expectedTenantId && input.expectedTenantId !== tenantId) throw new Error("سياق الكافيه غير صحيح.");
    if (input.expectedBranchId && input.expectedBranchId !== branchId) throw new Error("سياق الفرع غير صحيح.");
    const table = input.tableId ? cafeDataService.getTables().find((item) => item.id === input.tableId) : undefined;
    const { items, totals } = this.calculate(input.items, input.couponCode, input.orderType === "DELIVERY" ? input.deliveryZoneId : undefined, input.customerId);
    const order = await orderApiService.create({ branchId, orderType: input.orderType, source: input.source ?? "POS", tableNumber: table?.number, customerName: input.customerName, customerPhone: input.customerPhone, customerAddress: input.customerAddress, customerNotes: input.customerNotes, discount: totals.discount, tax: totals.tax, serviceCharge: totals.serviceCharge, deliveryFee: totals.deliveryFee, paymentMethod: input.paymentMethod, paymentStatus: input.deferPayment ? "PENDING" : "PAID", items: items.map(apiItem) });
    if (!input.deferPayment) await paymentApiService.create({ orderId: order.id, amount: order.total, method: input.paymentMethod });
    return { order };
  },
  checkout(input: CheckoutInput) {
    const { tenantId, branchId } = activeContext();
    if (input.expectedTenantId && input.expectedTenantId !== tenantId)
      throw new Error("سياق الكافيه لا يطابق رابط الطلب.");
    if (input.expectedBranchId && input.expectedBranchId !== branchId)
      throw new Error("سياق الفرع لا يطابق رابط الطلب.");
    if (input.orderType === "TABLE" && !input.tableId)
      throw new Error("اختر طاولة للطلب داخل الكافيه.");
    const table = input.tableId
      ? cafeDataService
          .getTables()
          .find((item) => item.id === input.tableId && item.isActive)
      : undefined;
    if (input.tableId && !table)
      throw new Error("الطاولة غير صالحة لهذا الفرع.");
    if (
      input.orderType === "DELIVERY" &&
      (!input.customerName?.trim() ||
        !input.customerPhone?.trim() ||
        !input.customerAddress?.trim() ||
        !input.deliveryZoneId)
    )
      throw new Error("بيانات العميل والعنوان ومنطقة التوصيل مطلوبة.");
    const { items, totals } = this.calculate(
      input.items,
      input.couponCode,
      input.orderType === "DELIVERY" ? input.deliveryZoneId : undefined,
      input.customerId,
    );
    const timestamp = new Date().toISOString();
    if (
      !input.deferPayment &&
      input.paymentMethod === "CASH" &&
      Number(input.receivedAmount) < totals.total
    )
      throw new Error("المبلغ المستلم أقل من إجمالي الطلب.");
    if (
      input.paymentMethod === "MIXED" &&
      roundMoney(
        (input.paymentAllocations ?? []).reduce(
          (sum, part) => sum + part.amount,
          0,
        ),
      ) !== totals.total
    )
      throw new Error("مبالغ الدفع المختلط لا تساوي إجمالي الطلب.");
    const order: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      branchId,
      orderNumber: `ORD-${String(Date.now()).slice(-6)}`,
      tableId: table?.id,
      tableNumber: table?.number ?? 0,
      orderType: input.orderType,
      source: input.source ?? "POS",
      customerId: input.customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      customerNotes: input.customerNotes,
      deliveryZoneId: input.deliveryZoneId,
      couponCode: input.couponCode?.trim().toUpperCase() || undefined,
      couponDiscount: totals.discount,
      status: "NEW",
      paymentStatus: input.deferPayment ? "PENDING" : "PAID",
      paymentMethod: input.paymentMethod,
      items,
      ...totals,
      createdAt: timestamp,
      updatedAt: timestamp,
      timeline: [
        {
          status: "NEW",
          employeeId: useAuthStore.getState().user?.employeeId,
          at: timestamp,
        },
      ],
    };
    this.validateInventory(order);
    const inventoryConsumed = this.consumeInventory(order);
    if (inventoryConsumed) order.inventoryConsumedAt = timestamp;
    cafeDataService.saveOrders([order, ...cafeDataService.getOrders()]);
    const payment = input.deferPayment ? undefined : cafeOperationsService.create<PaymentRecord>("payments", {
      orderId: order.id,
      transactionNumber: `PAY-${String(Date.now()).slice(-8)}`,
      customerId: input.customerId,
      employeeId: useAuthStore.getState().user?.employeeId,
      amount: order.total,
      method: input.paymentMethod,
      allocations: input.paymentAllocations,
      receivedAmount: input.receivedAmount,
      changeAmount:
        input.paymentMethod === "CASH"
          ? roundMoney(Number(input.receivedAmount) - order.total)
          : 0,
      status: "PAID",
      createdAt: timestamp,
    });
    const cashAmount = input.deferPayment
      ? 0
      : input.paymentMethod === "CASH"
        ? order.total
        : input.paymentMethod === "MIXED"
          ? (input.paymentAllocations?.find((part) => part.method === "CASH")
              ?.amount ?? 0)
          : 0;
    if (cashAmount > 0)
      financeService.createCashMovement({
        orderId: order.id,
        paymentId: payment?.id,
        type: "CASH_SALE",
        amount: cashAmount,
        reason: `بيع نقدي للطلب ${order.orderNumber}`,
      });
    if (input.couponCode) {
      const coupons = cafeOperationsService.get<Coupon>("coupons");
      cafeOperationsService.save(
        "coupons",
        coupons.map((coupon) =>
          coupon.code.toLowerCase() === input.couponCode?.trim().toLowerCase()
            ? {
                ...coupon,
                usageCount: Number(coupon.usageCount ?? 0) + 1,
                usages: [
                  ...(coupon.usages ?? []),
                  {
                    orderId: order.id,
                    customerId: input.customerId,
                    usedAt: timestamp,
                  },
                ],
              }
            : coupon,
        ),
      );
    }
    if (input.customerId)
      customerService.earnForOrder(input.customerId, order.id, order.total);
    cafeOperationsService.audit({
      branchId,
      module: "pos",
      action: "ORDER_CHECKOUT",
      description: `تم إنشاء الطلب ${order.orderNumber} وتسجيل الدفع`,
      entityType: "order",
      entityId: order.id,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("orders:changed"));
      window.dispatchEvent(new Event("operations:changed"));
    }
    return { order, payment };
  },
  validateInventory(order: Order) {
    if (!inventoryConsumptionEnabled(order.tenantId)) return;
    const recipes = cafeOperationsService.get<Recipe>("recipes");
    const inventory = cafeOperationsService.get<InventoryItem>("inventory");
    const requirements = getInventoryRequirements(order, recipes, inventory);
    requirements.forEach((quantity, inventoryItemId) => {
      const item = inventory.find((entry) => entry.id === inventoryItemId);
      if (!item) throw new Error("أحد مكونات الوصفة غير موجود في مخزون الفرع.");
      if (quantity > item.quantity)
        throw new Error(`المخزون غير كافٍ للمكون ${item.name}.`);
    });
  },
  consumeInventory(order: Order) {
    if (!inventoryConsumptionEnabled(order.tenantId)) return false;
    const recipes = cafeOperationsService.get<Recipe>("recipes");
    const inventory = cafeOperationsService.get<InventoryItem>("inventory");
    if (!recipes.length || !inventory.length) return false;
    const requirements = getInventoryRequirements(order, recipes, inventory);
    if (!requirements.size) return false;
    this.validateInventory(order);
    const updated = inventory.map((item) => {
      const quantity = requirements.get(item.id);
      if (!quantity) return item;
      const after = roundMoney(item.quantity - quantity);
      const movement: Omit<StockMovement, "id" | "tenantId"> = {
        inventoryItemId: item.id,
        type: "SALE",
        quantity,
        quantityBefore: item.quantity,
        quantityAfter: after,
        notes: order.orderNumber,
        createdAt: new Date().toISOString(),
      };
      cafeOperationsService.create<StockMovement>("stockMovements", movement);
      return { ...item, quantity: after, updatedAt: new Date().toISOString() };
    });
    cafeOperationsService.save("inventory", updated);
    const notifications =
      cafeOperationsService.get<NotificationRecord>("notifications");
    updated
      .filter((item) => item.quantity <= item.minimumStock)
      .forEach((item) => {
        if (
          notifications.some(
            (notification) =>
              !notification.read &&
              notification.relatedEntityType === "inventory" &&
              notification.relatedEntityId === item.id,
          )
        )
          return;
        cafeOperationsService.create<NotificationRecord>("notifications", {
          type: item.quantity <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
          title: item.quantity <= 0 ? "نفد عنصر من المخزون" : "مخزون منخفض",
          message: `${item.name}: ${item.quantity} ${item.unit}`,
          read: false,
          relatedEntityType: "inventory",
          relatedEntityId: item.id,
          createdAt: new Date().toISOString(),
        });
      });
    return true;
  },
};

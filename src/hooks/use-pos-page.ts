"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { useBranch } from "@/providers/branch-provider";
import { useTenant } from "@/providers/tenant-provider";
import { cafeDataService } from "@/services/cafe-data.service";
import { cafeOperationsService } from "@/services/cafe-operations.service";
import { checkoutService, type CheckoutInput } from "@/services/checkout.service";
import { modifierService } from "@/services/modifier.service";
import { modifierApiService } from "@/services/modifier-api.service";
import { useCartStore } from "@/store/cart.store";
import { useOrdersStore } from "@/store/orders.store";
import type {
  Customer,
  DeliveryZone,
  ModifierGroup,
} from "@/types/cafe-operations.types";
import type { OrderType } from "@/types/order.types";
import type { Product } from "@/types/product.types";
import type { PaymentConfirmation } from "@/components/admin/payment-dialog";

export function usePosPage() {
  const searchParams = useSearchParams();
  const manualOrder = searchParams.get("source") === "manual";
  const { tenant } = useTenant();
  const { branch } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("TABLE");
  const [tableId, setTableId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, string[]>
  >({});
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const remove = useCartStore((state) => state.removeItem);
  const increase = useCartStore((state) => state.increaseQuantity);
  const decrease = useCartStore((state) => state.decreaseQuantity);
  const updateNotes = useCartStore((state) => state.updateNotes);
  const clearCart = useCartStore((state) => state.clearCart);
  const tables = cafeDataService.getTables();
  const customers = cafeOperationsService.get<Customer>("customers");
  const zones = cafeOperationsService
    .get<DeliveryZone>("deliveryZones")
    .filter((zone) => zone.active);

  function resetDraft() {
    setTableId("");
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setDeliveryZoneId("");
    setCouponCode("");
    setPaymentOpen(false);
  }

  useEffect(() => {
    const reload = () => setProducts(cafeDataService.getBranchProducts());
    const reset = () => {
      reload();
      clearCart();
      resetDraft();
    };
    reload();
    void modifierApiService.list().then((groups) => modifierService.setGroups(groups)).catch(() => undefined);
    window.addEventListener("tenant:changed", reset);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("tenant:changed", reset);
      window.removeEventListener("branch:changed", reset);
    };
  }, [clearCart]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isAvailable &&
          (!query || product.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [products, query],
  );
  const calculation = useMemo(() => {
    try {
      return {
        result: checkoutService.calculate(
          items,
          couponCode || undefined,
          orderType === "DELIVERY" ? deliveryZoneId || undefined : undefined,
          customerId || undefined,
        ),
        error: "",
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "تعذر حساب الطلب.",
      };
    }
  }, [couponCode, customerId, deliveryZoneId, items, orderType]);
  const money = (value: number) =>
    formatMoney(value, tenant.settings.currencySymbol);

  function selectCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone ?? "");
      setCustomerAddress(customer.address ?? "");
    }
  }

  function quickCustomer() {
    try {
      const customer = checkoutService.createQuickCustomer({
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      });
      setCustomerId(customer.id);
      toast.success("تمت إضافة العميل");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة العميل");
    }
  }

  function chooseProduct(product: Product) {
    const groups = modifierService.getForProduct(product.id);
    if (!groups.length) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
      });
      return;
    }
    setSelectedProduct(product);
    setModifierGroups(groups);
    setModifierSelections({});
  }

  function toggleModifier(group: ModifierGroup, optionId: string) {
    setModifierSelections((current) => {
      const selected = current[group.id] ?? [];
      const next =
        group.maxSelections === 1
          ? [optionId]
          : selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId];
      return { ...current, [group.id]: next };
    });
  }

  function confirmModifiers() {
    if (!selectedProduct) return;
    try {
      const selectedModifiers = modifierService.validateAndSnapshot(
        selectedProduct.id,
        Object.entries(modifierSelections).map(([groupId, optionIds]) => ({
          groupId,
          optionIds,
        })),
      );
      addItem({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: 1,
        image: selectedProduct.image,
        selectedModifiers,
      });
      setSelectedProduct(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تطبيق الاختيارات.",
      );
    }
  }

  function changeOrderType(value: OrderType) {
    setOrderType(value);
    setTableId("");
    setDeliveryZoneId("");
  }

  function openPayment() {
    if (!branch) return toast.error("لا يوجد فرع نشط.");
    if (!items.length) return toast.error("السلة فارغة.");
    if (orderType === "TABLE" && !tableId)
      return toast.error("اختر طاولة أولًا.");
    if (
      orderType === "DELIVERY" &&
      (!customerName.trim() ||
        !customerPhone.trim() ||
        !customerAddress.trim() ||
        !deliveryZoneId)
    )
      return toast.error("أكمل بيانات التوصيل المطلوبة.");
    if (calculation.error) return toast.error(calculation.error);
    setPaymentOpen(true);
  }

  async function checkout(payment: PaymentConfirmation) {
    setSubmitting(true);
    try {
      const checkoutInput: CheckoutInput = {
        items,
        orderType,
        tableId: tableId || undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        deliveryZoneId: deliveryZoneId || undefined,
        couponCode: couponCode || undefined,
        paymentMethod: payment.method,
        paymentAllocations: payment.allocations,
        receivedAmount: payment.receivedAmount,
        source: manualOrder ? "MANUAL" : "POS",
      };
      let order;
      try {
        ({ order } = await checkoutService.checkoutRemote(checkoutInput));
      } catch {
        ({ order } = checkoutService.checkout(checkoutInput));
      }
      clearCart();
      resetDraft();
      useOrdersStore.getState().loadForTenant(tenant.id);
      toast.success(`تم إنشاء الطلب ${order.orderNumber} بنجاح`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الطلب.");
    } finally {
      setSubmitting(false);
    }
  }

  function cancelDraft() {
    clearCart();
    resetDraft();
  }

  const totals = calculation.result?.totals ?? {
    subtotal: 0,
    discount: 0,
    tax: 0,
    serviceCharge: 0,
    deliveryFee: 0,
    total: 0,
  };
  return {
    branch,
    calculation,
    cancelDraft,
    changeOrderType,
    checkout,
    chooseProduct,
    confirmModifiers,
    couponCode,
    customerAddress,
    customerId,
    customerName,
    customerPhone,
    customers,
    decrease,
    deliveryZoneId,
    increase,
    items,
    manualOrder,
    modifierGroups,
    modifierSelections,
    money,
    openPayment,
    orderType,
    paymentOpen,
    quickCustomer,
    query,
    remove,
    selectCustomer,
    selectedProduct,
    setCouponCode,
    setCustomerAddress,
    setCustomerName,
    setCustomerPhone,
    setDeliveryZoneId,
    setPaymentOpen,
    setQuery,
    setSelectedProduct,
    setTableId,
    submitting,
    tableId,
    tables,
    tenant,
    toggleModifier,
    totals,
    updateNotes,
    visibleProducts,
    zones,
  };
}

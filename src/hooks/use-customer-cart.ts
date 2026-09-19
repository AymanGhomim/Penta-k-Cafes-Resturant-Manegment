"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  customerCartCopy,
  customerOrderCopy,
} from "@/components/features/customer-cart/customer-cart-copy";
import type { Locale } from "@/lib/menu-translations";
import { useCustomerRoute } from "@/providers/customer-route-provider";
import { checkoutService, type CheckoutInput } from "@/services/checkout.service";
import { useCartStore } from "@/store/cart.store";
import { useSettingsStore } from "@/store/settings.store";
import type { DeliveryZone } from "@/types/cafe-operations.types";
import { deliveryZoneApiService } from "@/services/delivery-zone-api.service";

export function useCustomerCart() {
  const router = useRouter();
  const customerRoute = useCustomerRoute();
  const customerContext = customerRoute.context;
  const lockedOrderType = Boolean(customerContext?.orderType);
  const [locale, setLocale] = useState<Locale>("en");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay">(
    "cash",
  );
  const [orderType, setOrderType] = useState<"delivery" | "takeaway" | null>(
    null,
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [deliveryZoneId, setDeliveryZoneId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const items = useCartStore((state) => state.items);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const serviceTaxPercent = useSettingsStore(
    (state) => state.serviceTaxPercent,
  );
  const getServiceTaxAmount = useSettingsStore(
    (state) => state.getServiceTaxAmount,
  );
  const getTotalWithServiceTax = useSettingsStore(
    (state) => state.getTotalWithServiceTax,
  );

  useEffect(() => {
    if (window.localStorage.getItem("cafe-ui-locale") === "ar") setLocale("ar");
    useSettingsStore.getState().loadForTenant();
    void deliveryZoneApiService.list().then((zones) => setDeliveryZones(zones.filter((zone) => zone.active))).catch(() => setDeliveryZones([]));
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("cafe-ui-locale", locale);
  }, [locale]);
  useEffect(() => {
    if (customerContext?.table) {
      setOrderType(null);
      return;
    }
    if (customerContext?.orderType === "DELIVERY") setOrderType("delivery");
    else if (customerContext?.orderType === "TAKEAWAY")
      setOrderType("takeaway");
  }, [customerContext?.orderType, customerContext?.table]);

  const text = customerCartCopy[locale];
  const orderText = customerOrderCopy(locale);
  const scannedTableNumber = customerContext?.table?.number
    ? String(customerContext.table.number)
    : null;
  const unitPrice = (item: (typeof items)[number]) =>
    item.price +
    Number(item.variantPrice ?? 0) +
    (item.addons ?? []).reduce((sum, addon) => sum + addon.price, 0) +
    (item.selectedModifiers ?? []).reduce(
      (sum, modifier) => sum + modifier.priceAdjustment,
      0,
    );
  const subtotal = items.reduce(
    (sum, item) => sum + unitPrice(item) * item.quantity,
    0,
  );
  const serviceTax = getServiceTaxAmount(subtotal);
  const total = getTotalWithServiceTax(subtotal);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  async function submitOrder() {
    if (!customerContext)
      return toast.error("تعذر تحديد بيانات الكافيه والفرع.");
    if (!customerContext.table && !orderType)
      return toast.error("اختر نوع الطلب.");
    if (
      !customerContext.table &&
      (!customerName.trim() || !customerPhone.trim())
    )
      return toast.error("اسم العميل ورقم الهاتف مطلوبان.");
    if (
      orderType === "delivery" &&
      (!customerAddress.trim() || !deliveryZoneId)
    )
      return toast.error("العنوان ومنطقة التوصيل مطلوبان.");
    setSubmitting(true);
    try {
      const checkoutInput: CheckoutInput = {
        items,
        orderType: customerContext.table
          ? "TABLE"
          : orderType === "delivery"
            ? "DELIVERY"
            : "TAKEAWAY",
        tableId: customerContext.table?.id,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        deliveryZoneId: orderType === "delivery" ? deliveryZoneId : undefined,
        paymentMethod: "CASH",
        source:
          customerContext.table || customerContext.orderType
            ? "QR_MENU"
            : "ONLINE_MENU",
        expectedTenantId: customerContext.tenant.id,
        expectedBranchId: customerContext.branch.id,
        deferPayment: true,
      };
      let result;
      try {
        result = await checkoutService.checkoutRemote(checkoutInput);
      } catch {
        result = checkoutService.checkout(checkoutInput);
      }
      clearCart();
      router.push(customerRoute.href(`/order/${result.order.id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الطلب.");
      setSubmitting(false);
    }
  }

  return {
    customerAddress,
    customerContext,
    customerName,
    customerNotes,
    customerPhone,
    customerRoute,
    decreaseQuantity,
    deliveryZoneId,
    deliveryZones,
    increaseQuantity,
    items,
    locale,
    lockedOrderType,
    orderText,
    orderType,
    paymentMethod,
    removeItem,
    scannedTableNumber,
    serviceTax,
    serviceTaxPercent,
    setCustomerAddress,
    setCustomerName,
    setCustomerNotes,
    setCustomerPhone,
    setDeliveryZoneId,
    setLocale,
    setOrderType,
    setPaymentMethod,
    submitOrder,
    submitting,
    subtotal,
    text,
    total,
    totalItems,
    unitPrice,
  };
}

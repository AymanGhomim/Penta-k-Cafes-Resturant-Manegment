"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import { orderApiService } from "@/services/order-api.service";
import { toCsv } from "@/lib/csv";
import { useOrdersStore } from "@/store/orders.store";
import type { Order, OrderStatus } from "@/types/order.types";

export function useOrdersPage() {
  const orders = useOrdersStore((state) => state.orders);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [employee, setEmployee] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    const reload = () => {
      setCancelTarget(null);
      useOrdersStore.getState().loadForTenant();
    };
    reload();
    window.addEventListener("orders:changed", reload);
    window.addEventListener("tenant:changed", reload);
    window.addEventListener("branch:changed", reload);
    return () => {
      window.removeEventListener("orders:changed", reload);
      window.removeEventListener("tenant:changed", reload);
      window.removeEventListener("branch:changed", reload);
    };
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const search =
          `${order.orderNumber} ${order.customerName ?? ""} ${order.customerPhone ?? ""} ${order.tableNumber}`.toLowerCase();
        return (
          (!query.trim() || search.includes(query.trim().toLowerCase())) &&
          (status === "ALL" || order.status === status) &&
          (type === "ALL" || order.orderType === type) &&
          (source === "ALL" || order.source === source) &&
          (payment === "ALL" || order.paymentStatus === payment) &&
          (method === "ALL" || order.paymentMethod === method) &&
          (employee === "ALL" || order.createdBy === employee) &&
          (!dateFrom || order.createdAt.slice(0, 10) >= dateFrom) &&
          (!dateTo || order.createdAt.slice(0, 10) <= dateTo)
        );
      }),
    [
      dateFrom,
      dateTo,
      employee,
      method,
      orders,
      payment,
      query,
      source,
      status,
      type,
    ],
  );

  const pagination = usePagination(
    filteredOrders,
    [
      query,
      status,
      type,
      source,
      payment,
      method,
      employee,
      dateFrom,
      dateTo,
    ].join(":"),
  );

  async function advanceOrder(order: Order) {
    const sequence: OrderStatus[] = [
      "NEW",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "COMPLETED",
    ];
    const index = sequence.indexOf(order.status);
    if (index < 0 || index >= sequence.length - 1) return;
    try {
      await orderApiService.updateStatus(order.id, sequence[index + 1]);
      useOrdersStore.getState().loadForTenant();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة."); }
  }

  function openCancellation(order: Order) {
    setCancelTarget(order);
    setCancelReason("");
  }

  async function confirmCancellation() {
    if (!cancelTarget) return;
    try {
      await orderApiService.updateStatus(cancelTarget.id, "CANCELLED");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إلغاء الطلب."); return; }
    setCancelTarget(null);
    setCancelReason("");
    setCancelConfirmOpen(false);
    useOrdersStore.getState().loadForTenant();
    window.dispatchEvent(new Event("orders:changed"));
    toast.success("تم إلغاء الطلب");
  }

  function refresh() {
    useOrdersStore.getState().loadForTenant();
    toast.success("تم تحديث قائمة الطلبات");
  }

  function exportOrders() {
    try {
      const csv = toCsv(
        filteredOrders.map((order) => ({
          رقم_الطلب: order.orderNumber,
          التاريخ: order.createdAt,
          المصدر: order.source,
          النوع: order.orderType,
          العميل: order.customerName,
          الإجمالي: order.total,
          الدفع: order.paymentStatus,
          الحالة: order.status,
        })),
      );
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التصدير.");
    }
  }

  return {
    advanceOrder,
    cancelConfirmOpen,
    cancelReason,
    cancelTarget,
    confirmCancellation,
    dateFrom,
    dateTo,
    employee,
    exportOrders,
    filteredOrders,
    method,
    openCancellation,
    orders,
    pagination,
    payment,
    query,
    refresh,
    setCancelConfirmOpen,
    setCancelReason,
    setCancelTarget,
    setDateFrom,
    setDateTo,
    setEmployee,
    setMethod,
    setPayment,
    setQuery,
    setSource,
    setStatus,
    setType,
    source,
    status,
    type,
  };
}

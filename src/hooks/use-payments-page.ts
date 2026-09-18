"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { useTenant } from "@/providers/tenant-provider";
import { branchService } from "@/services/branch.service";
import { customerService } from "@/services/customer.service";
import { employeeService } from "@/services/employee.service";
import { financeService } from "@/services/finance.service";
import { paymentApiService } from "@/services/payment-api.service";
import type { PaymentRecord } from "@/types/cafe-operations.types";

export function usePaymentsPage() {
  const { tenant } = useTenant();
  const access = useCurrentEmployee();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [date, setDate] = useState("");
  const reload = () => { void paymentApiService.list().then(setPayments).catch(() => setPayments(financeService.getPayments())); };
  useEffect(() => {
    reload();
    const reset = () => {
      reload();
      setSelectedId(null);
      setRefundOpen(false);
      setQuery("");
    };
    window.addEventListener("operations:changed", reload);
    window.addEventListener("tenant:changed", reset);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("operations:changed", reload);
      window.removeEventListener("tenant:changed", reset);
      window.removeEventListener("branch:changed", reset);
    };
  }, []);
  const details = selectedId
    ? financeService.getPaymentDetails(selectedId)
    : undefined;
  const orders = new Map(
    payments.map((payment) => [
      payment.id,
      financeService.getPaymentDetails(payment.id)?.order,
    ]),
  );
  const branches = new Map(
    branchService
      .getBranches(tenant.id)
      .map((branch) => [branch.id, branch.name]),
  );
  const employees = new Map(
    employeeService
      .getEmployees(tenant.id)
      .map((employee) => [employee.id, employee.name]),
  );
  const customers = new Map(
    customerService
      .getCustomers()
      .map((customer) => [customer.id, customer.name]),
  );
  const filteredPayments = payments.filter((payment) => {
    const order = orders.get(payment.id);
    const haystack =
      `${payment.transactionNumber ?? payment.id} ${order?.orderNumber ?? ""} ${order?.customerName ?? customers.get(payment.customerId ?? "") ?? ""}`.toLowerCase();
    return (
      (!query || haystack.includes(query.toLowerCase())) &&
      (method === "ALL" || payment.method === method) &&
      (status === "ALL" || payment.status === status) &&
      (!date || payment.createdAt.slice(0, 10) === date)
    );
  });
  const pagination = usePagination(
    filteredPayments,
    `${query}:${method}:${status}:${date}`,
  );
  function clearFilters() {
    setQuery("");
    setDate("");
    setMethod("ALL");
    setStatus("ALL");
  }
  function openRefund() {
    if (!details) return;
    setRefundAmount(String(details.remainingRefundable));
    setRefundOpen(true);
  }
  async function processRefund() {
    if (!details) return;
    try {
      try { await paymentApiService.refund(details.payment.id, Number(refundAmount), refundReason); }
      catch { financeService.processRefund(details.payment.id, Number(refundAmount), refundReason); }
      setConfirmRefund(false);
      setRefundOpen(false);
      setRefundAmount("");
      setRefundReason("");
      reload();
      toast.success("تم تسجيل الاسترجاع وتحديث حالة الدفع.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تنفيذ الاسترجاع.",
      );
    }
  }
  return {
    access,
    branches,
    clearFilters,
    confirmRefund,
    customers,
    date,
    details,
    employees,
    filteredPayments,
    method,
    openRefund,
    orders,
    pagination,
    processRefund,
    query,
    refundAmount,
    refundOpen,
    refundReason,
    selectedId,
    setConfirmRefund,
    setDate,
    setMethod,
    setQuery,
    setRefundAmount,
    setRefundOpen,
    setRefundReason,
    setSelectedId,
    setStatus,
    status,
    tenant,
  };
}

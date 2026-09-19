"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "@/components/access/permission-gate";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  OrderInfoCard,
  OrderItemsCard,
  OrderPaymentsCard,
  OrderTimelineCard,
} from "@/components/features/orders/order-details-sections";
import { OrderReceipt } from "@/components/features/orders/receipt/order-receipt";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeTenantBranding } from "@/lib/tenant-branding";
import { useBranch } from "@/providers/branch-provider";
import { useTenant } from "@/providers/tenant-provider";
import { financeService } from "@/services/finance.service";
import {
  canTransitionOrderStatus,
} from "@/services/order.service";
import { orderApiService } from "@/services/order-api.service";
import { branchService } from "@/services/branch.service";
import type { Order, OrderStatus } from "@/types/order.types";
import { orderStatusPresentation } from "@shared/presentation/order";
import { buildOrderReceiptData } from "@shared/presentation/order-receipt";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const { tenant } = useTenant();
  const { branch } = useBranch();
  const [order, setOrder] = useState<Order>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");
  const reload = useCallback(() => { void orderApiService.list(branchService.getActiveBranchId() ?? undefined).then((orders) => setOrder(orders.find((item) => item.id === params.orderId))).catch(() => setOrder(undefined)); }, [params.orderId]);
  useEffect(() => {
    reload();
    window.addEventListener("orders:changed", reload);
    return () => window.removeEventListener("orders:changed", reload);
  }, [reload]);
  if (!order)
    return (
      <AdminShell>
        <div dir="rtl" className="mx-auto max-w-3xl p-12 text-center">
          <h1 className="text-2xl font-black">الطلب غير موجود</h1>
          <p className="mt-2 text-muted-foreground">
            الطلب لا ينتمي إلى الكافيه أو الفرع الحالي، أو تم حذفه.
          </p>
        </div>
      </AdminShell>
    );
  const branding = normalizeTenantBranding(tenant.branding);
  const payments = financeService
    .getPayments()
    .filter((payment) => payment.orderId === order.id);
  const refunds = financeService
    .getRefunds()
    .filter((refund) => refund.orderId === order.id);
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
  const cashPayment = payments.find(
    (payment) => payment.receivedAmount !== undefined || payment.changeAmount !== undefined,
  );
  const receipt = buildOrderReceiptData({
    order,
    tenant,
    branch,
    branding,
    payment: {
      paidAmount: payments.length ? paid : undefined,
      refundedAmount: refunds.length ? refunded : undefined,
      cashReceived: cashPayment?.receivedAmount,
      changeAmount: cashPayment?.changeAmount,
    },
  });

  function move() {
    const target = nextStatus[order!.status];
    if (!target) return;
    try {
      void orderApiService.updateStatus(order!.id, target).then(() => { reload(); toast.success("تم تحديث حالة الطلب."); });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التحديث.");
    }
  }

  async function cancel() {
    try {
      await orderApiService.updateStatus(order!.id, "CANCELLED");
      setCancelOpen(false);
      setConfirmCancel(false);
      reload();
      toast.success("تم إلغاء الطلب دون استرجاع مالي تلقائي.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الإلغاء.");
    }
  }

  const targetStatus = nextStatus[order.status];
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5"
      >
        <Breadcrumbs
          items={[
            { label: "الطلبات", href: "/admin/orders" },
            { label: order.orderNumber },
          ]}
        />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-accent">تفاصيل الطلب</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black">{order.orderNumber}</h1>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate permission="orders.print">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="ml-2 h-4 w-4" />
                طباعة
              </Button>
            </PermissionGate>
            {targetStatus ? (
              <PermissionGate permission="orders.update">
                <Button onClick={move}>
                  {orderStatusPresentation[targetStatus].label}
                </Button>
              </PermissionGate>
            ) : null}
            {canTransitionOrderStatus(order.status, "CANCELLED") ? (
              <PermissionGate permission="orders.cancel">
                <Button
                  variant="destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  إلغاء الطلب
                </Button>
              </PermissionGate>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <OrderInfoCard order={order} branchName={branch?.name} />
            <OrderItemsCard
              order={order}
              currency={tenant.settings.currencySymbol}
            />
            <OrderTimelineCard order={order} />
          </div>
          <div className="space-y-4">
            <OrderReceipt receipt={receipt} />
            <OrderPaymentsCard
              payments={payments}
              refundable={paid - refunded > 0}
              currency={tenant.settings.currencySymbol}
            />
          </div>
        </div>
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إلغاء الطلب</DialogTitle>
              <DialogDescription>
                الإلغاء لا ينفذ استرجاعًا ماليًا تلقائيًا.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="سبب الإلغاء"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              variant="destructive"
              disabled={!reason.trim()}
              onClick={() => setConfirmCancel(true)}
            >
              متابعة
            </Button>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="تأكيد إلغاء الطلب؟"
          description={`السبب: ${reason}`}
          confirmLabel="إلغاء الطلب"
          onConfirm={cancel}
        />
      </section>
    </AdminShell>
  );
}

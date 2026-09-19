import { RotateCcw } from "lucide-react";
import { paymentMethodLabels } from "@/components/features/payments/payment-presentation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import type { PaymentRecord, RefundRecord } from "@/types/cafe-operations.types";

type Details = { payment: PaymentRecord; order?: { orderNumber: string; customerName?: string }; refunds: RefundRecord[]; totalRefunded: number; remainingRefundable: number; status: PaymentRecord["status"] };
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

export function PaymentDialogs({
  details,
  branches,
  employees,
  currency,
  canRefund,
  refundOpen,
  confirmRefund,
  refundAmount,
  refundReason,
  onDetailsClose,
  onOpenRefund,
  onRefundOpenChange,
  onConfirmOpenChange,
  onAmountChange,
  onReasonChange,
  onProcessRefund,
}: {
  details?: Details;
  branches: Map<string, string>;
  employees: Map<string, string>;
  currency: string;
  canRefund: boolean;
  refundOpen: boolean;
  confirmRefund: boolean;
  refundAmount: string;
  refundReason: string;
  onDetailsClose: () => void;
  onOpenRefund: () => void;
  onRefundOpenChange: (open: boolean) => void;
  onConfirmOpenChange: (open: boolean) => void;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onProcessRefund: () => void;
}) {
  return (
    <>
      <Dialog
        open={Boolean(details)}
        onOpenChange={(open) => !open && onDetailsClose()}
      >
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل عملية الدفع</DialogTitle>
            <DialogDescription>
              {details?.payment.transactionNumber ?? details?.payment.id}
            </DialogDescription>
          </DialogHeader>
          {details ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <Info label="الطلب" value={details.order?.orderNumber ?? "—"} />
                <Info
                  label="المبلغ"
                  value={formatMoney(details.payment.amount, currency)}
                />
                <Info
                  label="طريقة الدفع"
                  value={paymentMethodLabels[details.payment.method]}
                />
                <Info
                  label="الفرع"
                  value={
                    branches.get(details.payment.branchId ?? "") ??
                    "الفرع الحالي"
                  }
                />
                <Info
                  label="الموظف"
                  value={employees.get(details.payment.employeeId ?? "") ?? "—"}
                />
                <Info
                  label="مرجع العملية"
                  value={details.payment.transactionReference ?? "غير متاح"}
                />
                <Info
                  label="المسترجع"
                  value={formatMoney(details.totalRefunded, currency)}
                />
                <Info
                  label="المتاح للاسترجاع"
                  value={formatMoney(details.remainingRefundable, currency)}
                />
              </div>
              {details.payment.allocations?.length ? (
                <div>
                  <b>تفاصيل الدفع المختلط</b>
                  {details.payment.allocations.map((part) => (
                    <div
                      key={part.method}
                      className="mt-2 flex justify-between rounded border p-2"
                    >
                      <span>{paymentMethodLabels[part.method]}</span>
                      <b>{formatMoney(part.amount, currency)}</b>
                    </div>
                  ))}
                </div>
              ) : null}
              {details.refunds.length ? (
                <div>
                  <b>عمليات الاسترجاع</b>
                  {details.refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="mt-2 flex justify-between rounded border p-2 text-sm"
                    >
                      <span>{refund.reason}</span>
                      <b>{formatMoney(refund.amount, currency)}</b>
                    </div>
                  ))}
                </div>
              ) : null}
              {canRefund && details.remainingRefundable > 0 ? (
                <Button variant="destructive" onClick={onOpenRefund}>
                  <RotateCcw className="ml-2 h-4 w-4" />
                  إنشاء استرجاع
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={refundOpen} onOpenChange={onRefundOpenChange}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء استرجاع</DialogTitle>
            <DialogDescription>
              لن يؤدي إلغاء الطلب وحده إلى استرجاع مالي؛ هذه العملية مستقلة.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-bold">
            المبلغ
            <Input
              type="number"
              min="0.01"
              max={details?.remainingRefundable}
              step="0.01"
              value={refundAmount}
              onChange={(event) => onAmountChange(event.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            السبب
            <Input
              value={refundReason}
              onChange={(event) => onReasonChange(event.target.value)}
            />
          </label>
          <Button
            variant="destructive"
            onClick={() => onConfirmOpenChange(true)}
          >
            مراجعة الاسترجاع
          </Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmRefund}
        onOpenChange={onConfirmOpenChange}
        title="تأكيد الاسترجاع المالي؟"
        description={`سيتم استرجاع ${refundAmount || 0} ${currency} وتحديث حالة الدفع.`}
        confirmLabel="تأكيد الاسترجاع"
        onConfirm={onProcessRefund}
      />
    </>
  );
}

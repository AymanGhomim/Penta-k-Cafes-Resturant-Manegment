import { Eye } from "lucide-react";
import { paymentMethodLabels } from "@/components/features/payments/payment-presentation";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { PaginationState } from "@/hooks/use-pagination";
import { formatDateTime } from "@/lib/formatters";
import { formatMoney } from "@/lib/money";
import type { PaymentRecord } from "@/types/cafe-operations.types";

export function PaymentsTable({
  payments,
  orders,
  branches,
  employees,
  customers,
  currency,
  pagination,
  onView,
}: {
  payments: PaymentRecord[];
  orders: Map<string, { orderNumber: string; customerName?: string } | undefined>;
  branches: Map<string, string>;
  employees: Map<string, string>;
  customers: Map<string, string>;
  currency: string;
  pagination: {
    state: PaginationState;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  onView: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-right text-sm">
        <thead className="bg-muted/50">
          <tr>
            {[
              "رقم العملية",
              "رقم الطلب",
              "العميل",
              "الفرع",
              "المبلغ",
              "طريقة الدفع",
              "الحالة",
              "الموظف",
              "التاريخ",
              "الإجراءات",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const order = orders.get(payment.id);
            return (
              <tr key={payment.id} className="border-t">
                <td className="px-4 py-3 font-bold">
                  {payment.transactionNumber ?? payment.id}
                </td>
                <td className="px-4 py-3">{order?.orderNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {order?.customerName ??
                    customers.get(payment.customerId ?? "") ??
                    "عميل نقدي"}
                </td>
                <td className="px-4 py-3">
                  {branches.get(payment.branchId ?? "") ?? "الفرع الحالي"}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatMoney(payment.amount, currency)}
                </td>
                <td className="px-4 py-3">
                  {paymentMethodLabels[payment.method]}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3">
                  {employees.get(payment.employeeId ?? "") ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {formatDateTime(payment.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onView(payment.id)}
                  >
                    <Eye className="ml-1 h-4 w-4" />
                    عرض
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!pagination.state.total ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          لا توجد مدفوعات حتى الآن.
        </div>
      ) : null}
      <Pagination
        {...pagination.state}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}

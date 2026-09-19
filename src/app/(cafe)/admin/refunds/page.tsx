"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useTenant } from "@/providers/tenant-provider";
import { paymentApiService } from "@/services/payment-api.service";
import type { PaymentRecord } from "@/types/cafe-operations.types";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { usePagination } from "@/hooks/use-pagination";
import { formatDateTime } from "@/lib/formatters";
export default function RefundsPage() {
  const { tenant } = useTenant();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const reload = () => { void paymentApiService.list().then((items) => setRecords(items.filter((item) => (item.refundAmount ?? 0) > 0))).catch(() => setRecords([])); };
  useEffect(() => {
    reload();
    window.addEventListener("operations:changed", reload);
    return () => window.removeEventListener("operations:changed", reload);
  }, []);
  const pagination = usePagination(records);
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <p className="text-xs font-bold text-accent">المالية</p>
        <h1 className="mt-1 text-2xl font-black">الاسترجاعات</h1>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          سجل الاسترجاعات الكامل للفرع الحالي. إنشاء الاسترجاع متاح من تفاصيل
          عملية الدفع.
        </p>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "الطلب",
                    "عملية الدفع",
                    "النوع",
                    "المبلغ",
                    "السبب",
                    "الموظف",
                    "التاريخ",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="px-4 py-3">
                      {record.orderNumber ?? record.orderId}
                    </td>
                    <td className="px-4 py-3">
                      {record.transactionNumber ?? record.id}
                    </td>
                    <td className="px-4 py-3">
                      {(record.refundAmount ?? 0) >= record.amount ? "كامل" : "جزئي"}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {formatMoney(
                        record.refundAmount ?? 0,
                        tenant.settings.currencySymbol,
                      )}
                    </td>
                    <td className="px-4 py-3">استرجاع مسجل من عملية الدفع</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3">
                      {formatDateTime(record.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length ? (
              <EmptyState title="لا توجد عمليات استرجاع حتى الآن" description="ستظهر هنا عمليات الاسترجاع الكاملة والجزئية." />
            ) : null}
            <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}

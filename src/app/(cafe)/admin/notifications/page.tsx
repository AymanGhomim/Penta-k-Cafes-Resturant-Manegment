"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { engagementService } from "@/services/engagement.service";
import type { NotificationRecord } from "@/types/cafe-operations.types";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { usePagination } from "@/hooks/use-pagination";
import { formatRelativeTime } from "@/lib/formatters";
const routes: Record<string, string> = {
  order: "/admin/orders",
  table: "/admin/tables",
  waiterRequest: "/admin/waiter-requests",
  payment: "/admin/payments",
  inventory: "/admin/inventory",
};
const permissions: Record<
  string,
  Parameters<ReturnType<typeof useCurrentEmployee>["hasPermission"]>[0]
> = {
  order: "orders.view",
  table: "tables.view",
  waiterRequest: "waiterRequests.view",
  payment: "payments.view",
  inventory: "inventory.view",
};
export default function NotificationsPage() {
  const access = useCurrentEmployee();
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const reload = () => { void engagementService.getNotifications().then(setRecords).catch(() => setRecords([])); };
  useEffect(() => {
    reload();
    window.addEventListener("operations:changed", reload);
    return () => window.removeEventListener("operations:changed", reload);
  }, []);
  const sortedRecords = useMemo(() => [...records].reverse(), [records]);
  const pagination = usePagination(sortedRecords);
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">الإدارة</p>
            <h1 className="text-2xl font-black">الإشعارات</h1>
            <p className="text-sm text-muted-foreground">
              تنبيهات الكافيه والفرع المرتبطة بالعمليات.
            </p>
          </div>
          <PermissionGate permission="notifications.manage">
            <Button
              variant="outline"
              disabled={!records.some((r) => !r.read)}
              onClick={() => {
                void engagementService.markAllNotificationsRead();
                reload();
              }}
            >
              <CheckCheck className="ml-2 h-4 w-4" />
              تحديد الكل كمقروء
            </Button>
          </PermissionGate>
        </div>
        <Card>
          <CardContent className="divide-y p-0">
            {pagination.items.map((record) => {
              const entity = record.relatedEntityType;
              const route = entity ? routes[entity] : undefined;
              const allowed = entity
                ? access.hasPermission(permissions[entity])
                : false;
              return (
                <div
                  key={record.id}
                  className={`p-4 ${record.read ? "opacity-65" : "bg-primary/5"}`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{record.title}</b>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {record.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRelativeTime(record.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {route && allowed ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={
                              record.relatedEntityId && entity === "order"
                                ? `/admin/orders/${record.relatedEntityId}`
                                : route
                            }
                          >
                            فتح
                          </Link>
                        </Button>
                      ) : null}
                      {!record.read ? (
                        <PermissionGate permission="notifications.manage">
                          <Button
                            size="sm"
                            onClick={() => {
                              void engagementService.markNotificationRead(record.id);
                              reload();
                            }}
                          >
                            مقروء
                          </Button>
                        </PermissionGate>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {!records.length ? (
              <EmptyState title="لا توجد إشعارات" description="ستظهر هنا تنبيهات الطلبات والمخزون والعمليات المهمة." />
            ) : null}
            <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}

"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { usePagination } from "@/hooks/use-pagination";
import { inventoryApiService } from "@/services/inventory-api.service";
import type { OperationResource } from "@/types/cafe-operations.types";
import type { PermissionKey } from "@/types/access-control.types";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
export type AdminModuleRow = {
  id?: string;
  title: string;
  meta: string;
  value: string;
  status?: string;
};
const EMPTY_ROWS: AdminModuleRow[] = [];
const resources: Record<string, OperationResource> = {
  inventory: "inventory",
  "stock-movements": "stockMovements",
  "stock-count": "stockCounts",
  waste: "waste",
  recipes: "recipes",
  suppliers: "suppliers",
  purchases: "purchases",
  expenses: "expenses",
  customers: "customers",
  loyalty: "loyalty",
  coupons: "coupons",
  "delivery-zones": "deliveryZones",
  payments: "payments",
  refunds: "refunds",
  "cash-register": "cashRegister",
  shifts: "shifts",
  notifications: "notifications",
  "activity-log": "auditLog",
};
const createPermission: Partial<Record<OperationResource, PermissionKey>> = {
  inventory: "inventory.create",
  stockCounts: "inventory.stockCount",
  waste: "inventory.waste",
  suppliers: "suppliers.manage",
  purchases: "purchases.create",
  expenses: "expenses.create",
  customers: "customers.manage",
  coupons: "coupons.manage",
  deliveryZones: "deliveryZones.manage",
  notifications: "notifications.manage",
};
const updatePermission: Partial<Record<OperationResource, PermissionKey>> = {
  suppliers: "suppliers.manage",
  expenses: "expenses.update",
  coupons: "coupons.manage",
  deliveryZones: "deliveryZones.manage",
};
const deletePermission: Partial<Record<OperationResource, PermissionKey>> = {
  suppliers: "suppliers.manage",
  expenses: "expenses.delete",
  coupons: "coupons.manage",
  deliveryZones: "deliveryZones.manage",
};
export function AdminModulePage({
  section,
  title,
  description,
  action = "إضافة",
  rows = EMPTY_ROWS,
  columns = ["العنصر", "التفاصيل", "القيمة", "الحالة"],
  onAdd,
  onDelete,
  onEdit,
}: {
  section: string;
  title: string;
  description: string;
  action?: string;
  rows?: AdminModuleRow[];
  columns?: string[];
  onAdd?: () => void;
  onDelete?: (recordId: string) => void;
  onEdit?: (recordId: string) => void;
}) {
  const pathname = usePathname();
  const { hasPermission } = useCurrentEmployee();
  const resource = resources[pathname.split("/").filter(Boolean).pop() || ""];
  const usesExternalRows = rows !== EMPTY_ROWS;
  const [records, setRecords] = useState<AdminModuleRow[]>([]);
  const [query, setQuery] = useState("");
  const reload = useCallback(() => {
    if (usesExternalRows || !resource) return setRecords(rows);
    void inventoryApiService.list(resource as Parameters<typeof inventoryApiService.list>[0]).then((data) => setRecords(
      data.map((record) => ({
        id: record.id,
        title: String(
          record.name ??
            record.title ??
            record.code ??
            record.invoiceNumber ??
            record.id,
        ),
        meta: String(
          record.phone ??
            record.description ??
            record.reason ??
            record.status ??
            "",
        ),
        value: String(record.amount ?? record.total ?? record.quantity ?? "—"),
        status:
          record.active === false ? "غير نشط" : String(record.status ?? "نشط"),
      })),
    )).catch(() => setRecords([]));
  }, [resource, rows, usesExternalRows]);
  useEffect(() => {
    reload();
    const h = () => {
      setQuery("");
      reload();
    };
    window.addEventListener("tenant:changed", h);
    window.addEventListener("branch:changed", h);
    window.addEventListener("operations:changed", h);
    return () => {
      window.removeEventListener("tenant:changed", h);
      window.removeEventListener("branch:changed", h);
      window.removeEventListener("operations:changed", h);
    };
  }, [pathname, reload]);
  const filtered = useMemo(
    () =>
      records.filter((row) =>
        `${row.title} ${row.meta} ${row.value} ${row.status ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, records],
  );
  const pagination = usePagination(filtered, query);
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-wide text-accent">
              {section}
            </p>
            <h1 className="mt-1 text-2xl font-black">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {onAdd &&
          (!resource ||
            !createPermission[resource] ||
            hasPermission(createPermission[resource]!)) ? (
            <Button onClick={onAdd}>
              <Plus className="ml-2 h-4 w-4" />
              {action}
            </Button>
          ) : null}
        </div>
        <Card className="overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-sm font-bold">قائمة {title}</h2>
              <SearchInput className="w-full max-w-xs" value={query} onChange={setQuery} placeholder={`بحث في ${title}...`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="px-4 py-3">
                        {column}
                      </th>
                    ))}
                    <th className="px-4 py-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map((row, index) => (
                    <tr
                      key={row.id ?? `${row.title}-${index}`}
                      className="border-t"
                    >
                      <td className="px-4 py-4 font-bold">{row.title}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {row.meta}
                      </td>
                      <td className="px-4 py-4">{row.value}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.status || "—"} />
                      </td>
                      <td className="px-4 py-4">
                        {row.id && (onEdit || onDelete) ? (
                          <div className="flex gap-1">
                            {onEdit && (!resource || !updatePermission[resource] || hasPermission(updatePermission[resource]!)) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(row.id!)}
                                aria-label={`تعديل ${row.title}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {onDelete && (!resource || !deletePermission[resource] || hasPermission(deletePermission[resource]!)) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(row.id!)}
                                aria-label={`حذف ${row.title}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length ? (
                <EmptyState title={`لا توجد بيانات في ${title} حتى الآن`} description="يمكنك إضافة أول سجل أو تغيير عبارة البحث الحالية." />
              ) : null}
              <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
            </div>
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}

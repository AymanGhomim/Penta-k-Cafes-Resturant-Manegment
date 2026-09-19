"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/access/permission-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tableApiService } from "@/services/table-api.service";
import { branchService } from "@/services/branch.service";
import { useTenant } from "@/providers/tenant-provider";
import type { Table } from "@/types/table.types";

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Table | null>(null);
  const { tenant } = useTenant();
  const reload = useCallback(() => { const branchId = branchService.getActiveBranchId(tenant.id); if (!branchId) return setTables([]); void tableApiService.list(branchId).then(setTables).catch(() => { setTables([]); toast.error("تعذر تحميل طاولات الفرع من الخادم."); }); }, [tenant.id]);
  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("tenant:changed", handler);
    window.addEventListener("branch:changed", handler);
    return () => {
      window.removeEventListener("tenant:changed", handler);
      window.removeEventListener("branch:changed", handler);
    };
  }, [reload]);
  const visible = useMemo(
    () =>
      tables.filter((table) => !query || String(table.number).includes(query)),
    [query, tables],
  );
  const deleteTable = async () => {
    if (!deleteTarget) return;
    try { await tableApiService.remove(deleteTarget.id); setTables((current) => current.filter((item) => item.id !== deleteTarget.id)); }
    catch { toast.error("تعذر حذف الطاولة من الخادم."); return; }
    setDeleteTarget(null);
    toast.success("تم حذف الطاولة.");
  };
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">المبيعات</p>
            <h1 className="mt-1 text-2xl font-black">الطاولات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              طاولات الكافيه الحالي والجلسات المرتبطة بها.
            </p>
          </div>
          <PermissionGate permission="tables.manage"><Button
            type="button"
            className="h-10 rounded-lg"
            onClick={() => {
              const number =
                tables.reduce((max, item) => Math.max(max, item.number), 0) + 1;
              const branchId = branchService.getActiveBranchId(tenant.id);
              if (!branchId) return toast.error("لا يوجد فرع نشط.");
              void tableApiService.create(branchId, number).then((table) => setTables((current) => [...current, table])).catch(() => toast.error("تعذر إضافة الطاولة من الخادم."));
              toast.success("تمت إضافة الطاولة");
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة طاولة
          </Button></PermissionGate>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="إجمالي الطاولات"
            value={tables.length}
            icon={ClipboardList}
          />
          <AdminStatCard
            label="المتاحة"
            value={tables.filter((item) => item.isActive).length}
            icon={ClipboardList}
          />
          <AdminStatCard
            label="خارج الخدمة"
            value={tables.filter((item) => !item.isActive).length}
            icon={ClipboardList}
          />
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="بحث برقم الطاولة"
          className="mb-4 h-10 max-w-sm rounded-lg"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((table) => (
            <Card key={table.id} className="rounded-xl">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-black">
                      طاولة {String(table.number).padStart(2, "0")}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      QR: {table.qrCode}
                    </p>
                  </div>
                  <Badge
                    className={
                      table.isActive
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-red-500/15 text-red-700"
                    }
                  >
                    {table.isActive ? "متاحة" : "خارج الخدمة"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PermissionGate permission="tables.manage"><Button
                    asChild
                    variant="outline"
                    className="h-9 rounded-lg text-xs"
                  >
                    <Link href={`/admin/qr?table=${table.number}`}>
                      <QrCode className="ml-1 h-3.5 w-3.5" />
                      عرض QR
                    </Link>
                  </Button></PermissionGate>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg text-xs"
                    onClick={() => void tableApiService.update(table.id, { isActive: !table.isActive }).then((updated) => setTables((current) => current.map((item) => item.id === table.id ? updated : item))).catch(() => toast.error("تعذر تغيير حالة الطاولة."))}
                  >
                    {table.isActive ? "إيقاف" : "تفعيل"}
                  </Button>
                </div>
                <PermissionGate permission="tables.manage"><Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-full text-xs text-destructive"
                  onClick={() => setDeleteTarget(table)}
                >
                  <Trash2 className="ml-1 h-3.5 w-3.5" />
                  حذف
                </Button></PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
        {!visible.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            لا توجد طاولات لهذا الكافيه حتى الآن.
          </div>
        ) : null}
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(value) => !value && setDeleteTarget(null)}
          title="حذف الطاولة؟"
          description="سيتم حذف الطاولة من الفرع الحالي. راجع أي طلبات مرتبطة بها قبل المتابعة."
          confirmLabel="حذف"
          onConfirm={deleteTable}
        />
      </section>
    </AdminShell>
  );
}

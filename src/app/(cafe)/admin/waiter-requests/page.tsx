"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, BellRing } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PermissionGate } from "@/components/access/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { engagementService } from "@/services/engagement.service";
import type { WaiterRequest } from "@/types/cafe-operations.types";
const types: Record<WaiterRequest["type"], string> = {
  WAITER: "طلب ويتر",
  BILL: "طلب الحساب",
  TISSUES: "مناديل",
  HELP: "مساعدة",
  OTHER: "أخرى",
};
export default function WaiterRequestsPage() {
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [table, setTable] = useState("ALL");
  const reload = () => { void engagementService.getWaiterRequests().then(setRequests).catch(() => setRequests([])); };
  useEffect(() => {
    reload();
    const reset = () => {
      reload();
      setStatus("ALL");
      setType("ALL");
      setTable("ALL");
    };
    window.addEventListener("operations:changed", reload);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("operations:changed", reload);
      window.removeEventListener("branch:changed", reset);
    };
  }, []);
  const filtered = useMemo(
    () =>
      requests.filter(
        (r) =>
          (status === "ALL" || r.status === status) &&
          (type === "ALL" || r.type === type) &&
          (table === "ALL" || r.tableId === table),
      ),
    [requests, status, type, table],
  );
  function update(id: string, next: "ACCEPTED" | "COMPLETED") {
    try {
      void engagementService.updateWaiterRequest(id, next).catch((error) => toast.error(error instanceof Error ? error.message : "تعذر تحديث الطلب."));
      reload();
      toast.success(
        next === "ACCEPTED" ? "تم استلام الطلب." : "تم تنفيذ الطلب.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الطلب.");
    }
  }
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <p className="text-xs font-bold text-accent">المنيو الإلكتروني</p>
        <h1 className="text-2xl font-black">طلبات الويتر</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          طلبات الخدمة المحفوظة للفرع والطاولة الحالية.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="طلبات جديدة"
            value={requests.filter((r) => r.status === "NEW").length}
            icon={BellRing}
          />
          <AdminStatCard
            label="قيد التنفيذ"
            value={requests.filter((r) => r.status === "ACCEPTED").length}
            icon={Clock3}
          />
          <AdminStatCard
            label="مكتملة اليوم"
            value={
              requests.filter(
                (r) =>
                  r.status === "COMPLETED" &&
                  r.completedAt?.slice(0, 10) ===
                    new Date().toISOString().slice(0, 10),
              ).length
            }
            icon={Check}
          />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="grid gap-2 border-b p-4 sm:grid-cols-3">
              <select
                className="h-10 rounded border bg-background px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">كل الحالات</option>
                <option value="NEW">جديد</option>
                <option value="ACCEPTED">مستلم</option>
                <option value="COMPLETED">مكتمل</option>
              </select>
              <select
                className="h-10 rounded border bg-background px-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="ALL">كل الأنواع</option>
                {Object.entries(types).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded border bg-background px-3"
                value={table}
                onChange={(e) => setTable(e.target.value)}
              >
                <option value="ALL">كل الطاولات</option>
                {Array.from(new Set(requests.map((r) => r.tableId))).map(
                  (id) => (
                    <option key={id} value={id}>
                      طاولة{" "}
                      {requests.find((r) => r.tableId === id)?.tableNumber ??
                        id}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-right text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "الطاولة",
                      "نوع الطلب",
                      "الوقت",
                      "الوقت المنقضي",
                      "الحالة",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-bold">
                        طاولة {r.tableNumber ?? r.tableId}
                      </td>
                      <td className="px-4 py-3">{types[r.type]}</td>
                      <td className="px-4 py-3">
                        {new Date(r.createdAt).toLocaleTimeString("ar-EG")}
                      </td>
                      <td className="px-4 py-3">
                        {Math.max(
                          0,
                          Math.floor(
                            (Date.now() - new Date(r.createdAt).getTime()) /
                              60000,
                          ),
                        )}{" "}
                        دقيقة
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PermissionGate permission="waiterRequests.manage">
                          {r.status === "NEW" ? (
                            <Button
                              size="sm"
                              onClick={() => update(r.id, "ACCEPTED")}
                            >
                              استلام
                            </Button>
                          ) : r.status === "ACCEPTED" ? (
                            <Button
                              size="sm"
                              onClick={() => update(r.id, "COMPLETED")}
                            >
                              تم التنفيذ
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              تم التنفيذ
                            </span>
                          )}
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  لا توجد طلبات ويتر.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}

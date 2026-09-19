"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { useTenant } from "@/providers/tenant-provider";
import { employeeService } from "@/services/employee.service";
import { shiftApiService } from "@/services/shift-api.service";
import type { Shift } from "@/types/cafe-operations.types";
export default function ShiftsPage() {
  const { tenant } = useTenant();
  const access = useCurrentEmployee();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState<Shift | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [cash, setCash] = useState("");
  const employees = employeeService
    .getEmployees(tenant.id)
    .filter((e) => e.status === "ACTIVE");
  const reload = () => { void shiftApiService.list().then(setShifts).catch(() => setShifts([])); };
  useEffect(() => {
    reload();
    const reset = () => {
      reload();
      setOpen(false);
      setClosing(null);
    };
    window.addEventListener("operations:changed", reload);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("operations:changed", reload);
      window.removeEventListener("branch:changed", reset);
    };
  }, []);
  async function submitOpen() {
    try {
      await shiftApiService.open(
        employeeId || access.employee?.id || "",
        Number(cash || 0),
      );
      setOpen(false);
      setCash("");
      reload();
      toast.success("تم فتح الوردية.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر فتح الوردية.");
    }
  }
  async function submitClose() {
    if (!closing) return;
    try {
      await shiftApiService.close(closing, Number(cash));
      setClosing(null);
      setCash("");
      reload();
      toast.success("تم إغلاق الوردية ومطابقة النقدية.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إغلاق الوردية.",
      );
    }
  }
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">المالية</p>
            <h1 className="text-2xl font-black">الورديات</h1>
            <p className="text-sm text-muted-foreground">
              فتح وإغلاق الوردية مع الرصيد المتوقع والفعلي والفرق.
            </p>
          </div>
          <PermissionGate permission="shifts.open">
            <Button
              onClick={() => {
                setEmployeeId(access.employee?.id ?? "");
                setCash("0");
                setOpen(true);
              }}
            >
              فتح وردية
            </Button>
          </PermissionGate>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "الموظف",
                    "بداية الوردية",
                    "رصيد البداية",
                    "المتوقع",
                    "الفعلي",
                    "الفرق",
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
                {[...shifts].reverse().map((shift) => {
                  const diff = Number(shift.difference ?? 0);
                  return (
                    <tr key={shift.id} className="border-t">
                      <td className="px-4 py-3 font-bold">
                        {employees.find((e) => e.id === shift.employeeId)
                          ?.name ?? shift.employeeId}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(shift.openedAt).toLocaleString("ar-EG")}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(
                          shift.openingCash,
                          tenant.settings.currencySymbol,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shift.expectedCash == null
                          ? "—"
                          : formatMoney(
                              shift.expectedCash,
                              tenant.settings.currencySymbol,
                            )}
                      </td>
                      <td className="px-4 py-3">
                        {shift.actualCash == null
                          ? "—"
                          : formatMoney(
                              shift.actualCash,
                              tenant.settings.currencySymbol,
                            )}
                      </td>
                      <td className="px-4 py-3">
                        {shift.status === "OPEN"
                          ? "—"
                          : `${diff === 0 ? "متطابق" : diff > 0 ? "زيادة" : "عجز"} · ${formatMoney(Math.abs(diff), tenant.settings.currencySymbol)}`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shift.status} />
                      </td>
                      <td className="px-4 py-3">
                        {shift.status === "OPEN" ? (
                          <PermissionGate permission="shifts.close">
                            <Button
                              size="sm"
                              onClick={() => {
                                setClosing(shift);
                                setCash("");
                              }}
                            >
                              إغلاق
                            </Button>
                          </PermissionGate>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!shifts.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد ورديات حتى الآن.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>فتح وردية</DialogTitle>
              <DialogDescription>
                لا يمكن فتح ورديتين نشطتين لنفس الموظف والفرع.
              </DialogDescription>
            </DialogHeader>
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="الرصيد الافتتاحي"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <Button onClick={submitOpen}>فتح الوردية</Button>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(closing)}
          onOpenChange={(value) => !value && setClosing(null)}
        >
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إغلاق الوردية</DialogTitle>
              <DialogDescription>
                أدخل الرصيد الفعلي الموجود في الخزنة.
              </DialogDescription>
            </DialogHeader>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="الرصيد الفعلي"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <Button onClick={submitClose}>إغلاق ومطابقة</Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

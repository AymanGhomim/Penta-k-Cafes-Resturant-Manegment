"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PermissionGate } from "@/components/access/permission-gate";
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
import { useTenant } from "@/providers/tenant-provider";
import { financeApiService, type CashSummary } from "@/services/finance-api.service";
import type { CashRegisterEntry } from "@/types/cafe-operations.types";
const labels: Record<CashRegisterEntry["type"], string> = {
  OPENING_BALANCE: "رصيد افتتاحي",
  CASH_SALE: "بيع نقدي",
  CASH_IN: "إيداع نقدي",
  CASH_OUT: "سحب نقدي",
  EXPENSE: "مصروف نقدي",
  REFUND: "استرجاع نقدي",
  SHIFT_ADJUSTMENT: "تسوية وردية",
};
export default function CashRegisterPage() {
  const { tenant } = useTenant();
  const [summary, setSummary] = useState<CashSummary>({ openingBalance: 0, cashSales: 0, cashIn: 0, cashOut: 0, expenses: 0, refunds: 0, adjustments: 0, expectedBalance: 0, entries: [] });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    const reload = () => { void financeApiService.getCashSummary().then(setSummary).catch(() => setSummary((current) => current)); };
    reload();
    window.addEventListener("operations:changed", reload);
    return () => window.removeEventListener("operations:changed", reload);
  }, []);
  const money = (v: number) => formatMoney(v, tenant.settings.currencySymbol);
  async function save() {
    try {
      await financeApiService.createCashMovement({
        type,
        amount: Number(amount),
        reason,
      });
      setOpen(false);
      setAmount("");
      setReason("");
      const next = await financeApiService.getCashSummary();
      setSummary(next);
      toast.success("تم تسجيل الحركة النقدية.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تسجيل الحركة.",
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
            <h1 className="text-2xl font-black">الخزنة</h1>
            <p className="text-sm text-muted-foreground">
              الرصيد محسوب من مصدر مركزي لحركات الفرع الحالي.
            </p>
          </div>
          <PermissionGate permission="cashRegister.manage">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setType("CASH_IN");
                  setOpen(true);
                }}
              >
                <ArrowDownLeft className="ml-1 h-4 w-4" />
                إيداع نقدي
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setType("CASH_OUT");
                  setOpen(true);
                }}
              >
                <ArrowUpRight className="ml-1 h-4 w-4" />
                سحب نقدي
              </Button>
            </div>
          </PermissionGate>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="الرصيد الافتتاحي"
            value={money(summary.openingBalance)}
            icon={Banknote}
          />
          <AdminStatCard
            label="المبيعات النقدية"
            value={money(summary.cashSales)}
            icon={Banknote}
          />
          <AdminStatCard
            label="الإيداعات / السحوبات"
            value={`${money(summary.cashIn)} / ${money(summary.cashOut)}`}
            icon={Banknote}
          />
          <AdminStatCard
            label="الرصيد المتوقع"
            value={money(summary.expectedBalance)}
            icon={Banknote}
          />
        </div>
        <Card className="mt-4">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "النوع",
                    "المبلغ",
                    "السبب",
                    "المرجع",
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
                {[...summary.entries].reverse().map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-3 font-bold">
                      {labels[entry.type]}
                    </td>
                    <td className="px-4 py-3">{money(entry.amount)}</td>
                    <td className="px-4 py-3">{entry.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      {entry.orderId ?? entry.expenseId ?? entry.shiftId ?? "—"}
                    </td>
                    <td className="px-4 py-3">{entry.employeeId ?? "—"}</td>
                    <td className="px-4 py-3">
                      {new Date(entry.createdAt).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!summary.entries.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد حركات خزنة حتى الآن.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {type === "CASH_IN" ? "إيداع نقدي" : "سحب نقدي"}
              </DialogTitle>
              <DialogDescription>
                سيتم تسجيل الموظف والفرع والوقت تلقائيًا.
              </DialogDescription>
            </DialogHeader>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="المبلغ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="السبب"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button onClick={save}>حفظ الحركة</Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

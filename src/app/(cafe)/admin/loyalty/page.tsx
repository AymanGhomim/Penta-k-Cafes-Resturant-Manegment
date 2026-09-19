"use client";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
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
import { customerLoyaltyApiService } from "@/services/customer-loyalty-api.service";
import type {
  LoyaltySettings,
} from "@/types/cafe-operations.types";
export default function LoyaltyPage() {
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings>({ id: "", tenantId: "", enabled: false, spendAmountPerPoint: 10, pointRedemptionValue: 0.1, minimumRedeemPoints: 100, updatedAt: new Date(0).toISOString() });
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [transactions, setTransactions] = useState<Array<{ id: string; customerId: string; type: "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRED"; points: number; orderId?: string; notes?: string; createdAt: string }>>([]);
  const [form, setForm] = useState({
    enabled: false,
    spendAmountPerPoint: "10",
    pointRedemptionValue: "0.1",
    minimumRedeemPoints: "100",
    maximumRedemptionAmount: "",
    expiryDays: "",
  });
  useEffect(() => {
    const reload = async () => {
      try { const [nextSettings, nextTransactions, nextCustomers] = await Promise.all([customerLoyaltyApiService.getLoyaltySettings(), customerLoyaltyApiService.listLoyaltyTransactions(), customerLoyaltyApiService.listCustomers()]); setRevision((v) => v + 1); setSettings(nextSettings); setTransactions(nextTransactions); setCustomers(nextCustomers); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل بيانات الولاء."); }
    };
    void reload();
    window.addEventListener("operations:changed", reload);
    return () => window.removeEventListener("operations:changed", reload);
  }, []);
  void revision;
  function edit() {
    setForm({
      enabled: settings.enabled,
      spendAmountPerPoint: String(settings.spendAmountPerPoint),
      pointRedemptionValue: String(settings.pointRedemptionValue),
      minimumRedeemPoints: String(settings.minimumRedeemPoints),
      maximumRedemptionAmount:
        settings.maximumRedemptionAmount == null
          ? ""
          : String(settings.maximumRedemptionAmount),
      expiryDays:
        settings.expiryDays == null ? "" : String(settings.expiryDays),
    });
    setOpen(true);
  }
  async function save() {
    try {
      await customerLoyaltyApiService.updateLoyaltySettings({
        enabled: form.enabled,
        spendAmountPerPoint: Number(form.spendAmountPerPoint),
        pointRedemptionValue: Number(form.pointRedemptionValue),
        minimumRedeemPoints: Number(form.minimumRedeemPoints),
        maximumRedemptionAmount: form.maximumRedemptionAmount
          ? Number(form.maximumRedemptionAmount)
          : undefined,
        expiryDays: form.expiryDays ? Number(form.expiryDays) : undefined,
      });
      setOpen(false);
      setSettings(await customerLoyaltyApiService.getLoyaltySettings());
      toast.success("تم حفظ إعدادات الولاء.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ الإعدادات.",
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
            <p className="text-xs font-bold text-accent">العملاء</p>
            <h1 className="text-2xl font-black">نقاط الولاء</h1>
            <p className="text-sm text-muted-foreground">
              إعدادات الكافيه وحركات النقاط المحسوبة مركزيًا.
            </p>
          </div>
          <PermissionGate permission="loyalty.manage">
            <Button onClick={edit}>
              <Settings2 className="ml-2 h-4 w-4" />
              إعدادات الولاء
            </Button>
          </PermissionGate>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["الحالة", settings.enabled ? "مفعّل" : "متوقف"],
            ["قيمة الكسب", `${settings.spendAmountPerPoint} ج.م / نقطة`],
            ["قيمة النقطة", `${settings.pointRedemptionValue} ج.م`],
            ["الحد الأدنى للاستبدال", `${settings.minimumRedeemPoints} نقطة`],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <b>{value}</b>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "العميل",
                    "النوع",
                    "النقاط",
                    "الطلب",
                    "ملاحظات",
                    "التاريخ",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...transactions].reverse().map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3 font-bold">
                      {customers.find((c) => c.id === t.customerId)?.name ??
                        "عميل غير معروف"}
                    </td>
                    <td className="px-4 py-3">
                      {
                        {
                          EARN: "كسب",
                          REDEEM: "استبدال",
                          ADJUSTMENT: "تسوية",
                          EXPIRED: "منتهية",
                        }[t.type]
                      }
                    </td>
                    <td className="px-4 py-3">
                      {t.type === "EARN" || t.type === "ADJUSTMENT" ? "+" : "-"}
                      {t.points}
                    </td>
                    <td className="px-4 py-3">{t.orderId ?? "—"}</td>
                    <td className="px-4 py-3">{t.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      {new Date(t.createdAt).toLocaleString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!transactions.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد حركات ولاء حتى الآن.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إعدادات برنامج الولاء</DialogTitle>
              <DialogDescription>
                تُطبق الإعدادات على مستوى الكافيه كله.
              </DialogDescription>
            </DialogHeader>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
              />
              تفعيل برنامج الولاء
            </label>
            {(
              [
                ["spendAmountPerPoint", "قيمة الإنفاق لكل نقطة"],
                ["pointRedemptionValue", "قيمة استبدال النقطة"],
                ["minimumRedeemPoints", "الحد الأدنى للاستبدال"],
                ["maximumRedemptionAmount", "الحد الأقصى لقيمة الاستبدال"],
                ["expiryDays", "مدة الصلاحية بالأيام"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm font-bold">
                {label}
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            <Button onClick={save}>حفظ الإعدادات</Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

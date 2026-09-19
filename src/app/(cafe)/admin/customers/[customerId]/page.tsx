"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PermissionGate } from "@/components/access/permission-gate";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { useTenant } from "@/providers/tenant-provider";
import { customerLoyaltyApiService, type RemoteCustomer } from "@/services/customer-loyalty-api.service";
import { financeService } from "@/services/finance.service";
const blank = {
  label: "",
  address: "",
  phone: "",
  notes: "",
  isDefault: false,
};
export default function CustomerDetailsPage() {
  const params = useParams<{ customerId: string }>();
  const { tenant } = useTenant();
  const [customer, setCustomer] = useState<RemoteCustomer>();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const reload = useCallback(
    () => { void customerLoyaltyApiService.findCustomer(params.customerId).then(setCustomer).catch(() => setCustomer(undefined)); },
    [params.customerId],
  );
  useEffect(() => {
    reload();
    window.addEventListener("operations:changed", reload);
    return () => window.removeEventListener("operations:changed", reload);
  }, [reload]);
  if (!customer)
    return (
      <AdminShell>
        <div dir="rtl" className="p-12 text-center">
          <h1 className="text-2xl font-black">العميل غير موجود</h1>
          <p className="text-muted-foreground">
            لا يمكن فتح عميل من كافيه آخر.
          </p>
        </div>
      </AdminShell>
    );
  const analytics = customer.analytics;
  const payments = financeService
    .getPayments()
    .filter((p) => analytics.orders.some((o) => o.id === p.orderId));
  async function saveAddress() {
    try {
      const address = { ...form, id: `address-${Date.now()}` };
      const addresses = [...(customer!.addresses ?? [])].filter((item) => item.id !== address.id);
      const nextAddresses = address.isDefault || !addresses.length ? [...addresses.map((item) => ({ ...item, isDefault: false })), address] : [...addresses, address];
      await customerLoyaltyApiService.updateAddresses(customer!.id, nextAddresses);
      setOpen(false);
      setForm(blank);
      reload();
      toast.success("تم حفظ العنوان.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ العنوان.");
    }
  }
  async function remove() {
    if (removeId) await customerLoyaltyApiService.updateAddresses(customer!.id, (customer!.addresses ?? []).filter((item) => item.id !== removeId));
    setRemoveId(null);
    reload();
    toast.success("تم حذف العنوان.");
  }
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1200px] px-3 py-5 sm:px-5"
      >
        <Breadcrumbs items={[{ label: "العملاء", href: "/admin/customers" }, { label: customer.name }]} />
        <p className="text-xs font-bold text-accent">ملف العميل</p>
        <h1 className="text-2xl font-black">{customer.name}</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["إجمالي الطلبات", String(analytics.orderCount)],
            [
              "إجمالي الإنفاق",
              formatMoney(analytics.totalSpend, tenant.settings.currencySymbol),
            ],
            [
              "متوسط الطلب",
              formatMoney(
                analytics.averageOrder,
                tenant.settings.currencySymbol,
              ),
            ],
            [
              "آخر زيارة",
              analytics.lastVisit
                ? new Date(analytics.lastVisit).toLocaleDateString("ar-EG")
                : "—",
            ],
            [
              "نقاط الولاء",
              String(customer.loyaltyBalance),
            ],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <b>{value}</b>
              </CardContent>
            </Card>
          ))}
        </div>
        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="flex w-full justify-start overflow-x-auto [&>button]:shrink-0">
            <TabsTrigger value="info">البيانات</TabsTrigger>
            <TabsTrigger value="addresses">العناوين</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="payments">المدفوعات</TabsTrigger>
            <TabsTrigger value="loyalty">الولاء</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <Card>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <Info label="الاسم" value={customer.name} />
                <Info label="الهاتف" value={customer.phone ?? "—"} />
                <Info label="البريد" value={customer.email ?? "—"} />
                <Info
                  label="تاريخ التسجيل"
                  value={new Date(customer.createdAt).toLocaleDateString(
                    "ar-EG",
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="addresses">
            <Card>
              <CardContent className="p-5">
                <PermissionGate permission="customers.manage">
                  <Button className="mb-3" onClick={() => setOpen(true)}>
                    <Plus className="ml-1 h-4 w-4" />
                    إضافة عنوان
                  </Button>
                </PermissionGate>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(customer.addresses ?? []).map((address) => (
                    <div key={address.id} className="rounded border p-4">
                      <div className="flex justify-between">
                        <b>
                          {address.label}
                          {address.isDefault ? " · افتراضي" : ""}
                        </b>
                        <PermissionGate permission="customers.manage">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setRemoveId(address.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </PermissionGate>
                      </div>
                      <p className="text-sm">{address.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {address.phone} {address.notes}
                      </p>
                    </div>
                  ))}
                </div>
                {!customer.addresses?.length ? (
                  <p className="p-8 text-center text-muted-foreground">
                    لا توجد عناوين محفوظة.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="orders">
            <Rows
              rows={analytics.orders.map((o) => [
                o.orderNumber,
                new Date(o.createdAt).toLocaleDateString("ar-EG"),
                formatMoney(o.total, tenant.settings.currencySymbol),
              ])}
            />
          </TabsContent>
          <TabsContent value="payments">
            <Rows
              rows={payments.map((p) => [
                p.transactionNumber ?? p.id,
                p.method,
                formatMoney(p.amount, tenant.settings.currencySymbol),
              ])}
            />
          </TabsContent>
          <TabsContent value="loyalty">
            <Card>
              <CardContent className="p-8 text-center">
                <b className="text-3xl">
                  {customer.loyaltyBalance}
                </b>
                <p className="text-sm text-muted-foreground">نقطة متاحة</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة عنوان</DialogTitle>
              <DialogDescription>
                لا توجد خرائط؛ أدخل العنوان نصيًا.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="اسم العنوان"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <Input
              placeholder="العنوان"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <Input
              placeholder="الهاتف (اختياري)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              placeholder="ملاحظات"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              العنوان الافتراضي
            </label>
            <Button onClick={saveAddress}>حفظ العنوان</Button>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={Boolean(removeId)}
          onOpenChange={(value) => !value && setRemoveId(null)}
          title="حذف العنوان؟"
          description="سيُحذف العنوان من ملف العميل."
          confirmLabel="حذف"
          onConfirm={remove}
        />
      </section>
    </AdminShell>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <b>{value}</b>
    </div>
  );
}
function Rows({ rows }: { rows: string[][] }) {
  return (
    <Card>
      <CardContent className="divide-y p-0">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-3 gap-2 p-4 text-sm">
            {row.map((value, i) => (
              <span key={i} className={i === 0 ? "font-bold" : ""}>
                {value}
              </span>
            ))}
          </div>
        ))}
        {!rows.length ? (
          <p className="p-8 text-center text-muted-foreground">
            لا توجد بيانات حتى الآن.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

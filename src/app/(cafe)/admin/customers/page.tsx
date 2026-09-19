"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
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
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/formatters";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { usePagination } from "@/hooks/use-pagination";
import { useTenant } from "@/providers/tenant-provider";
import { customerLoyaltyApiService, type RemoteCustomer } from "@/services/customer-loyalty-api.service";
const empty = { name: "", phone: "", email: "", address: "" };
export default function CustomersPage() {
  const { tenant } = useTenant();
  const [customers, setCustomers] = useState<RemoteCustomer[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof empty, string>>>({});
  const reload = async () => { try { setCustomers(await customerLoyaltyApiService.listCustomers()); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل العملاء."); } };
  useEffect(() => {
    void reload();
    const reset = () => {
      reload();
      setOpen(false);
      setQuery("");
    };
    window.addEventListener("operations:changed", () => void reload());
    window.addEventListener("tenant:changed", reset);
    return () => {
      window.removeEventListener("operations:changed", () => void reload());
      window.removeEventListener("tenant:changed", reset);
    };
  }, []);
  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.phone ?? ""} ${c.email ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [customers, query],
  );
  const pagination = usePagination(filtered, query);
  async function save() {
    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "اسم العميل مطلوب";
    if (form.phone.trim() && !/^\+?[0-9\s()-]{7,20}$/.test(form.phone.trim())) errors.phone = "رقم الهاتف غير صحيح";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "البريد الإلكتروني غير صحيح";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await customerLoyaltyApiService.createCustomer({ ...form, name: form.name.trim() });
      setOpen(false);
      setForm(empty);
      setFormErrors({});
      await reload();
      toast.success("تمت إضافة العميل بنجاح");
    } finally {
      setSaving(false);
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
            <h1 className="text-2xl font-black">العملاء</h1>
            <p className="text-sm text-muted-foreground">
              ملفات عملاء الكافيه وإحصاءاتهم المشتقة من الطلبات.
            </p>
          </div>
          <PermissionGate permission="customers.manage">
            <Button onClick={() => setOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة عميل
            </Button>
          </PermissionGate>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-4">
              <SearchInput className="max-w-sm" placeholder="بحث بالاسم أو الهاتف" value={query} onChange={setQuery} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-right text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "الاسم",
                      "الهاتف",
                      "عدد الطلبات",
                      "إجمالي الإنفاق",
                      "متوسط الطلب",
                      "نقاط الولاء",
                      "آخر طلب",
                      "تاريخ التسجيل",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagination.items.map((customer) => {
                    const analytics = customer.analytics;
                    return (
                      <tr key={customer.id} className="border-t">
                        <td className="px-4 py-3 font-bold">{customer.name}</td>
                        <td className="px-4 py-3">{customer.phone ?? "—"}</td>
                        <td className="px-4 py-3">{analytics.orderCount}</td>
                        <td className="px-4 py-3">
                          {formatMoney(
                            analytics.totalSpend,
                            tenant.settings.currencySymbol,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatMoney(
                            analytics.averageOrder,
                            tenant.settings.currencySymbol,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {customer.loyaltyBalance}
                        </td>
                        <td className="px-4 py-3">
                          {analytics.lastVisit
                            ? formatDate(analytics.lastVisit)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(customer.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/customers/${customer.id}`}>
                              <Eye className="ml-1 h-4 w-4" />
                              عرض
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filtered.length ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  لا يوجد عملاء حتى الآن.
                </div>
              ) : null}
              <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
            </div>
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة عميل</DialogTitle>
              <DialogDescription>
                العميل متاح لكل فروع الكافيه.
              </DialogDescription>
            </DialogHeader>
            {(
              [
                ["name", "الاسم *", "text"],
                ["phone", "الهاتف", "tel"],
                ["email", "البريد الإلكتروني", "email"],
                ["address", "العنوان", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="text-sm font-bold">
                {label}
                <Input
                  type={type}
                  value={form[key]}
                  required={key === "name"}
                  aria-invalid={Boolean(formErrors[key])}
                  aria-describedby={formErrors[key] ? `${key}-error` : undefined}
                  onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setFormErrors((current) => ({ ...current, [key]: undefined })); }}
                />
                {formErrors[key] ? <span id={`${key}-error`} className="mt-1 block text-xs font-semibold text-destructive">{formErrors[key]}</span> : null}
              </label>
            ))}
            <Button disabled={saving} onClick={save}>{saving ? "جاري الحفظ..." : "حفظ العميل"}</Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminModulePage } from "@/components/admin/admin-module-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { promotionsApiService } from "@/services/promotions-api.service";
import type { Coupon } from "@/types/cafe-operations.types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
const empty = {
  code: "",
  type: "PERCENTAGE" as Coupon["type"],
  value: "",
  minimumOrder: "0",
  maximumDiscount: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  perCustomerLimit: "",
};
export default function CouponsPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const reload = async () => {
    try { setCoupons(await promotionsApiService.listCoupons()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحميل الكوبونات."); }
  };
  useEffect(() => {
    const reset = () => {
      setOpen(false);
      setForm(empty);
    };
    window.addEventListener("tenant:changed", reset);
    void reload();
    return () => window.removeEventListener("tenant:changed", reset);
  }, []);
  async function save() {
    const value = Number(form.value);
    const minimumOrder = Number(form.minimumOrder || 0);
    const maximumDiscount = form.maximumDiscount
      ? Number(form.maximumDiscount)
      : undefined;
    if (!form.code.trim()) return toast.error("كود الكوبون مطلوب.");
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.startDate) > new Date(form.endDate)
    )
      return toast.error("تاريخ انتهاء الكوبون يجب أن يكون بعد تاريخ البداية.");
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (form.type === "PERCENTAGE" && value > 100)
    )
      return toast.error("قيمة الخصم غير صحيحة.");
    if (
      coupons.some(
          (coupon) =>
            coupon.id !== editingId &&
            coupon.code.toLowerCase() === form.code.trim().toLowerCase(),
        )
    )
      return toast.error("كود الكوبون مستخدم بالفعل.");
    const couponData = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      minimumOrder,
      maximumDiscount,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      active: true,
      usageCount: 0,
      usages: [],
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      perCustomerLimit: form.perCustomerLimit
        ? Number(form.perCustomerLimit)
        : undefined,
    };
    try {
      const coupon = editingId ? await promotionsApiService.updateCoupon(editingId, couponData) : await promotionsApiService.createCoupon(couponData);
      setOpen(false); setForm(empty); setEditingId(null); await reload(); toast.success(`تم حفظ الكوبون ${coupon.code} على الخادم.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ الكوبون."); }
  }
  return (
    <>
      <AdminModulePage
        section="إدارة المنيو"
        title="الكوبونات"
        description="إدارة كوبونات الكافيه وتطبيقها في نقطة البيع."
        rows={coupons.map((coupon) => ({ id: coupon.id, title: coupon.code, meta: `${coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `${coupon.value} ج.م`}`, value: `استخدم ${coupon.usageCount ?? 0} مرة`, status: coupon.active ? "نشط" : "غير نشط" }))}
        action="إضافة كوبون"
        onAdd={() => {
          setEditingId(null);
          setForm(empty);
          setOpen(true);
        }}
        onEdit={(id) => {
          const coupon = coupons.find((item) => item.id === id);
          if (!coupon) return;
          setEditingId(id);
          setForm({
            code: coupon.code,
            type: coupon.type,
            value: String(coupon.value),
            minimumOrder: String(coupon.minimumOrder ?? 0),
            maximumDiscount:
              coupon.maximumDiscount == null
                ? ""
                : String(coupon.maximumDiscount),
            startDate: coupon.startDate ?? "",
            endDate: coupon.endDate ?? "",
            usageLimit:
              coupon.usageLimit == null ? "" : String(coupon.usageLimit),
            perCustomerLimit:
              coupon.perCustomerLimit == null
                ? ""
                : String(coupon.perCustomerLimit),
          });
          setOpen(true);
        }}
        onDelete={setRemoveId}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "تعديل كوبون" : "إضافة كوبون"}
            </DialogTitle>
            <DialogDescription>
              حدد نوع الخصم وحدوده وفترة صلاحيته.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-semibold">
            الكود *
            <Input
              className="mt-1 uppercase"
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            نوع الخصم
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as Coupon["type"],
                }))
              }
            >
              <option value="PERCENTAGE">نسبة مئوية</option>
              <option value="FIXED">مبلغ ثابت</option>
            </select>
          </label>
          {(
            [
              ["value", "القيمة *", "number"],
              ["minimumOrder", "الحد الأدنى للطلب", "number"],
              ["maximumDiscount", "الحد الأقصى للخصم", "number"],
              ["startDate", "تاريخ البداية", "date"],
              ["endDate", "تاريخ الانتهاء", "date"],
              ["usageLimit", "إجمالي مرات الاستخدام", "number"],
              ["perCustomerLimit", "الحد لكل عميل", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <Input
                className="mt-1"
                type={type}
                min={type === "number" ? 0 : undefined}
                value={form[key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          <Button onClick={save}>حفظ الكوبون</Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(value) => !value && setRemoveId(null)}
        title="حذف الكوبون؟"
        description="لن يتغير الخصم المحفوظ داخل الطلبات السابقة."
        confirmLabel="حذف"
        onConfirm={() => {
          if (!removeId) return;
          void promotionsApiService.deleteCoupon(removeId).then(async () => { setRemoveId(null); await reload(); toast.success("تم حذف الكوبون."); }).catch((error) => toast.error(error instanceof Error ? error.message : "تعذر حذف الكوبون."));
        }}
      />
    </>
  );
}

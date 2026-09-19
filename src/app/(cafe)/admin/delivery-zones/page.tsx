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
import { deliveryZoneApiService } from "@/services/delivery-zone-api.service";
import type { DeliveryZone } from "@/types/cafe-operations.types";

const empty = {
  name: "",
  fee: "",
  minimumOrder: "",
  estimatedMinutes: "30",
  active: true,
};
export default function DeliveryZonesPage() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const refresh = () => { void deliveryZoneApiService.list().then(setZones).catch(() => setZones([])); };
  useEffect(() => {
    refresh();
    const reset = () => {
      setOpen(false);
      setForm(empty);
      refresh();
    };
    window.addEventListener("tenant:changed", reset);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("tenant:changed", reset);
      window.removeEventListener("branch:changed", reset);
    };
  }, []);
  async function save() {
    const fee = Number(form.fee);
    const minimumOrder = Number(form.minimumOrder || 0);
    const estimatedMinutes = Number(form.estimatedMinutes);
    if (!form.name.trim()) return toast.error("اسم المنطقة مطلوب.");
    if (
      ![fee, minimumOrder, estimatedMinutes].every(Number.isFinite) ||
      fee < 0 ||
      minimumOrder < 0 ||
      estimatedMinutes <= 0
    )
      return toast.error("راجع الرسوم والحد الأدنى والمدة المتوقعة.");
    setSaving(true);
    try {
      await deliveryZoneApiService.create({
        name: form.name.trim(),
        fee,
        minimumOrder,
        estimatedMinutes,
        active: form.active,
      });
      setOpen(false);
      setForm(empty);
      refresh();
      window.dispatchEvent(new Event("operations:changed"));
      toast.success("تمت إضافة منطقة التوصيل.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ المنطقة.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AdminModulePage
        section="المنيو الإلكتروني"
        title="مناطق التوصيل"
        description="إدارة مناطق ورسوم توصيل الفرع الحالي."
        action="إضافة منطقة"
        onAdd={() => setOpen(true)}
        rows={zones.map((zone) => ({ id: zone.id, title: zone.name, meta: `${zone.fee} رسوم · حد أدنى ${zone.minimumOrder}`, value: `${zone.estimatedMinutes} دقيقة`, status: zone.active ? "نشطة" : "غير نشطة" }))}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة منطقة توصيل</DialogTitle>
            <DialogDescription>
              ستظهر المنطقة في نقطة البيع لهذا الفرع فقط.
            </DialogDescription>
          </DialogHeader>
          {(
            [
              ["name", "اسم المنطقة", "text"],
              ["fee", "رسوم التوصيل", "number"],
              ["minimumOrder", "الحد الأدنى للطلب", "number"],
              ["estimatedMinutes", "الوقت المتوقع بالدقائق", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="text-sm font-semibold">
              {label}
              <Input
                className="mt-1"
                type={type}
                min={type === "number" ? 0 : undefined}
                value={String(form[key])}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            منطقة نشطة
          </label>
          <Button disabled={saving} onClick={save}>
            {saving ? "جارٍ الحفظ..." : "حفظ المنطقة"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

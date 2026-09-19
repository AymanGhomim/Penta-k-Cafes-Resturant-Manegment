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
import { inventoryApiService } from "@/services/inventory-api.service";
import { useBranch } from "@/providers/branch-provider";
import type { InventoryItem, StockMovement, WasteRecord } from "@/types/cafe-operations.types";

const empty = { inventoryItemId: "", quantity: "", reason: "", notes: "" };

export default function WastePage() {
  const { branch } = useBranch();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  useEffect(() => {
    void inventoryApiService.list<InventoryItem>("inventory").then((items) => setInventory(items.filter((item) => item.active))).catch(() => setInventory([]));
    setOpen(false);
    setForm(empty);
  }, [branch?.id]);
  const selected = inventory.find((item) => item.id === form.inventoryItemId);
  async function save() {
    const quantity = Number(form.quantity);
    if (!form.inventoryItemId) return toast.error("اختر عنصر المخزون.");
    if (!form.reason.trim()) return toast.error("سبب الهالك مطلوب.");
    setSaving(true);
    try {
      const movement = {
        inventoryItemId: form.inventoryItemId,
        quantity,
        unit: selected?.unit ?? "",
        quantityBefore: selected?.quantity ?? 0,
        quantityAfter: Math.max(0, (selected?.quantity ?? 0) - quantity),
        type: "WASTE" as const,
        reason: form.reason.trim(),
        notes: form.notes.trim(),
      };
      await inventoryApiService.create<WasteRecord>("waste", { inventoryItemId: form.inventoryItemId, quantity, unit: selected?.unit ?? "", estimatedCost: quantity * (selected?.averageCost ?? 0), reason: form.reason.trim(), notes: form.notes.trim() });
      if (selected) {
        await inventoryApiService.update<InventoryItem>(selected.id, { quantity: movement.quantityAfter });
        await inventoryApiService.create<StockMovement>("stockMovements", movement);
      }
      setOpen(false);
      setForm(empty);
      window.dispatchEvent(new Event("operations:changed"));
      toast.success("تم تسجيل الهالك وتحديث مخزون الفرع.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تسجيل الهالك.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AdminModulePage
        section="المخزون"
        title="الهالك"
        description="تسجيل الهالك وخصمه من مخزون الفرع مع إنشاء حركة مخزون وسجل نشاط."
        action="تسجيل هالك"
        onAdd={() => {
          setForm(empty);
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تسجيل هالك</DialogTitle>
            <DialogDescription>
              لا يمكن تسجيل كمية أكبر من الرصيد المتاح.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-semibold">
            عنصر المخزون *
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={form.inventoryItemId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  inventoryItemId: event.target.value,
                }))
              }
            >
              <option value="">اختر العنصر</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — متاح {item.quantity} {item.unit}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            الكمية *
            <Input
              className="mt-1"
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            السبب *
            <Input
              className="mt-1"
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            ملاحظات
            <Input
              className="mt-1"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          {!inventory.length ? (
            <p className="text-sm text-destructive">
              لا توجد عناصر مخزون نشطة في هذا الفرع.
            </p>
          ) : null}
          <Button disabled={saving || !inventory.length} onClick={save}>
            {saving ? "جارٍ التسجيل..." : "تسجيل الهالك"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

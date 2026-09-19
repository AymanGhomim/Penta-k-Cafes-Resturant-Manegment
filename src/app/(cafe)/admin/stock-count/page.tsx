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
import type { InventoryItem, StockCount } from "@/types/cafe-operations.types";

export default function StockCountPage() {
  const { branch } = useBranch();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actual, setActual] = useState<Record<string, string>>({});
  useEffect(() => {
    setOpen(false);
    setActual({});
    void inventoryApiService.list<InventoryItem>("inventory").then((items) => setInventory(items.filter((item) => item.active))).catch(() => setInventory([]));
  }, [branch?.id]);
  function start() {
    setActual(
      Object.fromEntries(
        inventory.map((item) => [item.id, String(item.quantity)]),
      ),
    );
    setOpen(true);
  }
  async function confirm() {
    if (!inventory.length) return;
    const items = inventory.map((item) => ({
      inventoryItemId: item.id,
      expectedQuantity: item.quantity,
      actualQuantity: Number(actual[item.id]),
    }));
    if (
      items.some(
        (item) =>
          !Number.isFinite(item.actualQuantity) || item.actualQuantity < 0,
      )
    )
      return toast.error("أدخل كمية فعلية صحيحة لكل عنصر.");
    setSaving(true);
    try {
      await inventoryApiService.create<StockCount>("stockCounts", {
        number: `COUNT-${Date.now()}`,
        items,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      });
      await Promise.all(items.map((item) => inventoryApiService.update<InventoryItem>(item.inventoryItemId, { quantity: item.actualQuantity, updatedAt: new Date().toISOString() })));
      setOpen(false);
      window.dispatchEvent(new Event("operations:changed"));
      toast.success("تم تأكيد الجرد وتحديث مخزون الفرع.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تأكيد الجرد.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AdminModulePage
        section="المخزون"
        title="الجرد"
        description="قارن الرصيد الفعلي بالمتوقع وأنشئ حركات تسوية للفروق فقط."
        action="جرد جديد"
        onAdd={start}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="rtl"
          className="max-h-[85vh] max-w-2xl overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>جرد جديد</DialogTitle>
            <DialogDescription>
              راجع الكمية الفعلية. التأكيد سيحدّث المخزون ولا يمكن تكراره لنفس
              الجرد.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-lg border">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_100px_140px] items-center gap-3 p-3 text-sm"
              >
                <div>
                  <b>{item.name}</b>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
                <div>المتوقع: {item.quantity}</div>
                <Input
                  aria-label={`الكمية الفعلية لـ ${item.name}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={actual[item.id] ?? ""}
                  onChange={(event) =>
                    setActual((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {!inventory.length ? (
            <p className="text-sm text-destructive">
              لا توجد عناصر مخزون نشطة لجردها.
            </p>
          ) : null}
          <Button disabled={saving || !inventory.length} onClick={confirm}>
            {saving ? "جارٍ التأكيد..." : "تأكيد الجرد"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

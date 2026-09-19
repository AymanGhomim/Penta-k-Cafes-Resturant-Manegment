"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { Badge } from "@/components/ui/badge";
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
import { cafeOperationsService } from "@/services/cafe-operations.service";
import { inventoryApiService } from "@/services/inventory-api.service";
import type {
  InventoryItem,
  Purchase,
  Supplier,
  StockMovement,
} from "@/types/cafe-operations.types";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/formatters";

const blank = () => ({
  invoiceNumber: `PUR-${Date.now().toString().slice(-6)}`,
  supplierId: "",
  inventoryItemId: "",
  quantity: "",
  unitCost: "",
  paid: "0",
});

export default function PurchasesPage() {
  const { tenant } = useTenant();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const reload = () => { void Promise.all([inventoryApiService.list<Purchase>("purchases"), inventoryApiService.list<InventoryItem>("inventory")]).then(([nextPurchases, nextInventory]) => { setPurchases(nextPurchases); setInventory(nextInventory.filter((item) => item.active)); }).catch(() => { setPurchases([]); setInventory([]); }); };
  useEffect(() => {
    reload();
    const handler = () => {
      setOpen(false);
      setForm(blank());
      reload();
    };
    window.addEventListener("tenant:changed", handler);
    window.addEventListener("branch:changed", handler);
    return () => {
      window.removeEventListener("tenant:changed", handler);
      window.removeEventListener("branch:changed", handler);
    };
  }, []);
  const suppliers = cafeOperationsService
    .get<Supplier>("suppliers")
    .filter((item) => item.active);
  const supplierName = (id: string) =>
    suppliers.find((item) => item.id === id)?.name ?? "مورد غير معروف";
  const pagination = usePagination(purchases);
  async function save() {
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    const paid = Number(form.paid);
    const total = quantity * unitCost;
    if (!form.invoiceNumber.trim() || !form.supplierId || !form.inventoryItemId)
      return toast.error("رقم الفاتورة والمورد والعنصر مطلوبة.");
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitCost) ||
      unitCost < 0 ||
      !Number.isFinite(paid) ||
      paid < 0 ||
      paid > total
    )
      return toast.error("راجع الكمية والتكلفة والمبلغ المدفوع.");
    setSaving(true);
    try {
      await inventoryApiService.create<Purchase>("purchases", {
        invoiceNumber: form.invoiceNumber.trim(),
        supplierId: form.supplierId,
        date: new Date().toISOString(),
        items: [
          { inventoryItemId: form.inventoryItemId, quantity, unitCost, total },
        ],
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        paid,
        remaining: total - paid,
        status: "ORDERED",
      });
      setOpen(false);
      setForm(blank());
      reload();
      toast.success("تم إنشاء فاتورة الشراء. استلمها عند وصول الأصناف.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ الفاتورة.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function receive(id: string) {
    try {
      const purchase = purchases.find((item) => item.id === id);
      if (!purchase || purchase.status === "RECEIVED") return;
      await inventoryApiService.update<Purchase>(id, { status: "RECEIVED" });
      for (const line of purchase.items) {
        const item = inventory.find((entry) => entry.id === line.inventoryItemId);
        if (!item) continue;
        await inventoryApiService.update<InventoryItem>(item.id, { quantity: item.quantity + line.quantity, averageCost: line.unitCost });
        await inventoryApiService.create<StockMovement>("stockMovements", { inventoryItemId: item.id, type: "PURCHASE", quantity: line.quantity, quantityBefore: item.quantity, quantityAfter: item.quantity + line.quantity, notes: purchase.invoiceNumber });
      }
      reload();
      toast.success("تم استلام الفاتورة وتحديث مخزون الفرع.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر استلام الفاتورة.",
      );
    }
  }
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between rounded-xl border bg-card p-5">
          <div>
            <p className="text-xs font-bold text-accent">المشتريات</p>
            <h1 className="mt-1 text-2xl font-black">المشتريات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              أنشئ فواتير الشراء ثم استلمها لتحديث مخزون الفرع.
            </p>
          </div>
          <PermissionGate permission="purchases.create"><Button
            onClick={() => {
              setForm(blank());
              setOpen(true);
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة فاتورة شراء
          </Button></PermissionGate>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[780px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "رقم الفاتورة",
                    "المورد",
                    "التاريخ",
                    "الإجمالي",
                    "المتبقي",
                    "الحالة",
                    "الإجراءات",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((purchase) => (
                  <tr key={purchase.id} className="border-t">
                    <td className="px-4 py-3 font-bold">
                      {purchase.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      {supplierName(purchase.supplierId)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(
                        purchase.total,
                        tenant.settings.currencySymbol,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(
                        purchase.remaining,
                        tenant.settings.currencySymbol,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>
                        {purchase.status === "RECEIVED"
                          ? "تم الاستلام"
                          : purchase.status === "CANCELLED"
                            ? "ملغاة"
                            : "قيد الطلب"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {purchase.status === "ORDERED" ? (
                        <PermissionGate permission="purchases.receive"><Button size="sm" onClick={() => receive(purchase.id)}>
                          استلام الفاتورة
                        </Button></PermissionGate>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!purchases.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد فواتير شراء في الفرع الحالي.
              </div>
            ) : null}
            <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-xl">
            <DialogHeader>
              <DialogTitle>إضافة فاتورة شراء</DialogTitle>
              <DialogDescription>
                هذه النسخة تدعم إضافة صنف واحد للفاتورة، ويمكن الاستلام بعد
                الحفظ.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                رقم الفاتورة *
                <Input
                  className="mt-1"
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      invoiceNumber: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-semibold">
                المورد *
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplierId: event.target.value,
                    }))
                  }
                >
                  <option value="">اختر المورد</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
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
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ["quantity", "الكمية *"],
                  ["unitCost", "تكلفة الوحدة *"],
                  ["paid", "المدفوع"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    step="0.01"
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
            </div>
            {!suppliers.length ? (
              <p className="text-sm text-destructive">
                أضف موردًا أولًا قبل إنشاء فاتورة شراء.
              </p>
            ) : null}
            <Button
              disabled={saving || !suppliers.length || !inventory.length}
              onClick={save}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
            </Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

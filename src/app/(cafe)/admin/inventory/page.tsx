"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackageX, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SmartDataTable, type SmartColumn } from "@/components/shared/smart-data-table";
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
import { inventoryApiService } from "@/services/inventory-api.service";
import type { InventoryItem } from "@/types/cafe-operations.types";

const blank = {
  name: "",
  sku: "",
  unit: "كجم",
  quantity: "0",
  minimumStock: "0",
  averageCost: "0",
};
const itemStatus = (item: InventoryItem) =>
  item.quantity <= 0
    ? "نفد من المخزون"
    : item.quantity <= item.minimumStock
      ? "مخزون منخفض"
      : "جيد";

export default function InventoryPage() {
  const { tenant } = useTenant();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GOOD" | "LOW" | "OUT">("ALL");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(blank);
  const reload = () => { void inventoryApiService.list<InventoryItem>("inventory").then(setItems).catch(() => setItems([])); };
  useEffect(() => {
    reload();
    const handler = () => {
      setOpen(false);
      setTarget(null);
      setForm(blank);
      reload();
    };
    window.addEventListener("tenant:changed", handler);
    window.addEventListener("branch:changed", handler);
    return () => {
      window.removeEventListener("tenant:changed", handler);
      window.removeEventListener("branch:changed", handler);
    };
  }, []);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          item.active &&
          `${item.name} ${item.sku ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (statusFilter === "ALL" ||
            (statusFilter === "OUT" && item.quantity <= 0) ||
            (statusFilter === "LOW" && item.quantity > 0 && item.quantity <= item.minimumStock) ||
            (statusFilter === "GOOD" && item.quantity > item.minimumStock)),
      ),
    [items, query, statusFilter],
  );
  const activeItems = items.filter((item) => item.active);
  const money = (value: number) =>
    formatMoney(value, tenant.settings.currencySymbol);
  async function save() {
    const quantity = Number(form.quantity);
    const minimumStock = Number(form.minimumStock);
    const averageCost = Number(form.averageCost);
    if (!form.name.trim() || !form.unit.trim())
      return toast.error("اسم العنصر والوحدة مطلوبان.");
    if (
      ![quantity, minimumStock, averageCost].every(Number.isFinite) ||
      quantity < 0 ||
      minimumStock < 0 ||
      averageCost < 0
    )
      return toast.error("قيم الكمية والتكلفة يجب أن تكون أرقامًا غير سالبة.");
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await inventoryApiService.create<InventoryItem>("inventory", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        unit: form.unit.trim(),
        quantity,
        minimumStock,
        averageCost,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      setOpen(false);
      setForm(blank);
      reload();
      toast.success("تمت إضافة عنصر المخزون بنجاح.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ العنصر.");
    } finally {
      setSaving(false);
    }
  }
  function disableTarget() {
    if (!target) return;
    void inventoryApiService.update<InventoryItem>(target.id, { active: false }).then(() => { setTarget(null); reload(); toast.success("تم تعطيل العنصر."); }).catch((error) => toast.error(error instanceof Error ? error.message : "تعذر تعطيل العنصر."));
  }
  const disableAction = (item: InventoryItem) => (
    <PermissionGate permission="inventory.adjust">
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setTarget(item)}>
        تعطيل
      </Button>
    </PermissionGate>
  );
  const columns: SmartColumn<InventoryItem>[] = [
    { key: "name", label: "العنصر", hideable: false, sortValue: (item) => item.name, render: (item) => <div><p className="font-black">{item.name}</p>{item.sku ? <p className="mt-1 text-xs text-muted-foreground">SKU: {item.sku}</p> : null}</div> },
    { key: "quantity", label: "الكمية", sortValue: (item) => item.quantity, render: (item) => <span className="font-bold">{item.quantity}</span> },
    { key: "unit", label: "الوحدة", sortValue: (item) => item.unit, render: (item) => item.unit },
    { key: "minimum", label: "الحد الأدنى", sortValue: (item) => item.minimumStock, render: (item) => item.minimumStock },
    { key: "cost", label: "متوسط التكلفة", sortValue: (item) => item.averageCost, render: (item) => money(item.averageCost) },
    { key: "value", label: "القيمة", sortValue: (item) => item.quantity * item.averageCost, render: (item) => <span className="font-black">{money(item.quantity * item.averageCost)}</span> },
    { key: "status", label: "الحالة", sortValue: (item) => item.quantity <= 0 ? 0 : item.quantity <= item.minimumStock ? 1 : 2, render: (item) => <Badge className={item.quantity <= 0 ? "bg-red-500/10 text-red-700" : item.quantity <= item.minimumStock ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}>{itemStatus(item)}</Badge> },
    { key: "actions", label: "الإجراءات", hideable: false, sticky: true, render: disableAction },
  ];
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">المخزون</p>
            <h1 className="mt-1 text-2xl font-black">المخزون</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة مخزون الفرع الحالي وتكاليفه.
            </p>
          </div>
          <PermissionGate permission="inventory.create"><Button onClick={() => setOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة عنصر
          </Button></PermissionGate>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="قيمة المخزون"
            value={money(
              activeItems.reduce(
                (sum, item) => sum + item.quantity * item.averageCost,
                0,
              ),
            )}
            icon={Boxes}
            tone="green"
          />
          <AdminStatCard
            label="عدد العناصر"
            value={activeItems.length}
            icon={Boxes}
            tone="blue"
            active={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          <AdminStatCard
            label="مخزون منخفض"
            value={
              activeItems.filter((item) => item.quantity > 0 && item.quantity <= item.minimumStock)
                .length
            }
            icon={AlertTriangle}
            tone="amber"
            active={statusFilter === "LOW"}
            onClick={() => setStatusFilter(statusFilter === "LOW" ? "ALL" : "LOW")}
          />
          <AdminStatCard
            label="نفد من المخزون"
            value={
              activeItems.filter((item) => item.quantity <= 0)
                .length
            }
            icon={PackageX}
            tone="red"
            active={statusFilter === "OUT"}
            onClick={() => setStatusFilter(statusFilter === "OUT" ? "ALL" : "OUT")}
          />
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو SKU" className="h-10 pr-9" />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-lg border bg-background px-3 text-sm font-bold">
                <option value="ALL">كل حالات المخزون</option>
                <option value="GOOD">مخزون جيد</option>
                <option value="LOW">مخزون منخفض</option>
                <option value="OUT">نفد من المخزون</option>
              </select>
            </div>
            <SmartDataTable
              data={visible}
              columns={columns}
              keyExtractor={(item) => item.id}
              storageKey="inventory-smart-table"
              initialSort={{ key: "name", direction: "asc" }}
              emptyTitle="لا توجد عناصر مطابقة"
              emptyDescription="غيّر البحث أو فلتر حالة المخزون لعرض نتائج أخرى."
              mobileCard={(item) => (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-black">{item.name}</p>{item.sku ? <p className="mt-1 text-xs text-muted-foreground">SKU: {item.sku}</p> : null}</div>
                      {columns.find((column) => column.key === "status")?.render(item)}
                    </div>
                    <div className="my-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/45 p-3 text-center text-xs">
                      <div><span className="text-muted-foreground">الكمية</span><b className="mt-1 block text-sm">{item.quantity} {item.unit}</b></div>
                      <div><span className="text-muted-foreground">التكلفة</span><b className="mt-1 block text-sm">{money(item.averageCost)}</b></div>
                      <div><span className="text-muted-foreground">القيمة</span><b className="mt-1 block text-sm">{money(item.quantity * item.averageCost)}</b></div>
                    </div>
                    <div className="flex justify-end">{disableAction(item)}</div>
                  </CardContent>
                </Card>
              )}
            />
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-xl">
            <DialogHeader>
              <DialogTitle>إضافة عنصر مخزون</DialogTitle>
              <DialogDescription>
                أدخل الرصيد الافتتاحي وتكلفة الوحدة في الفرع الحالي.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "الاسم *", "text"],
                  ["sku", "SKU", "text"],
                  ["unit", "الوحدة *", "text"],
                  ["quantity", "الكمية الافتتاحية", "number"],
                  ["minimumStock", "الحد الأدنى", "number"],
                  ["averageCost", "متوسط تكلفة الوحدة", "number"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  <Input
                    className="mt-1"
                    type={type}
                    min={type === "number" ? 0 : undefined}
                    step={type === "number" ? "0.01" : undefined}
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
            <Button disabled={saving} onClick={save}>
              {saving ? "جارٍ الحفظ..." : "حفظ العنصر"}
            </Button>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={Boolean(target)}
          onOpenChange={(value) => !value && setTarget(null)}
          title="تعطيل عنصر المخزون؟"
          description="سيختفي العنصر من العمليات الجديدة، ولن تُحذف حركاته السابقة."
          confirmLabel="تعطيل"
          onConfirm={disableTarget}
        />
      </section>
    </AdminShell>
  );
}

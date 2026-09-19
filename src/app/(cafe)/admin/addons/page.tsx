"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { cafeDataService } from "@/services/cafe-data.service";
import { modifierService } from "@/services/modifier.service";
import { modifierApiService } from "@/services/modifier-api.service";
import type { ModifierGroup } from "@/types/cafe-operations.types";

const blank = {
  name: "",
  required: false,
  min: "0",
  max: "1",
  options: "",
  productIds: [] as string[],
};

export default function AddonsPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const products = cafeDataService.getProducts();
  const refresh = () => { void modifierApiService.list().then((next) => { modifierService.setGroups(next); setGroups(next); }).catch(() => setGroups([])); };
  useEffect(() => {
    refresh();
    const reset = () => {
      refresh();
      setDialogOpen(false);
      setRemoveId(null);
      setForm(blank);
    };
    window.addEventListener("tenant:changed", reset);
    window.addEventListener("operations:changed", refresh);
    return () => {
      window.removeEventListener("tenant:changed", reset);
      window.removeEventListener("operations:changed", refresh);
    };
  }, []);

  async function save() {
    const minSelections = Number(form.min);
    const maxSelections = Number(form.max);
    const options = form.options
      .split("\n")
      .map((line, index) => {
        const [name, price = "0"] = line.split("|");
        return {
          id: `modifier-option-${Date.now()}-${index}`,
          name: name?.trim(),
          priceAdjustment: Number(price.trim()),
          available: true,
          sortOrder: index,
        };
      })
      .filter((item) => item.name);
    if (!form.name.trim()) return toast.error("اسم المجموعة مطلوب.");
    if (
      !Number.isInteger(minSelections) ||
      minSelections < 0 ||
      !Number.isInteger(maxSelections) ||
      maxSelections < Math.max(1, minSelections)
    )
      return toast.error("حدود الاختيار غير صحيحة.");
    if (
      !options.length ||
      options.some((item) => !Number.isFinite(item.priceAdjustment))
    )
      return toast.error("أضف خيارًا واحدًا على الأقل بصيغة: الاسم | السعر.");
    const data = {
      name: form.name.trim(),
      required: form.required,
      minSelections,
      maxSelections,
      productIds: form.productIds,
      options,
      active: true,
      sortOrder: groups.length,
    };
    await (editingId ? modifierApiService.update(editingId, data) : modifierApiService.create(data));
    setDialogOpen(false);
    setEditingId(null);
    setForm(blank);
    refresh();
    toast.success(
      editingId ? "تم تحديث مجموعة الخيارات." : "تمت إضافة مجموعة الخيارات.",
    );
  }

  async function toggleOption(groupId: string, optionId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    await modifierApiService.update(groupId, { options: group.options.map((option) => option.id === optionId ? { ...option, available: !option.available } : option) });
    refresh();
  }

  async function remove() {
    if (!removeId) return;
    await modifierApiService.remove(removeId);
    setRemoveId(null);
    refresh();
    toast.success("تم حذف المجموعة.");
  }

  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-accent">إدارة المنيو</p>
            <h1 className="mt-1 text-2xl font-black">الإضافات والخيارات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              نفس مجموعات التخصيص تُستخدم في نقطة البيع ومنيو العميل.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(blank);
              setDialogOpen(true);
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة مجموعة
          </Button>
        </div>
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <button
                    className="flex items-center gap-3 text-right"
                    onClick={() =>
                      setOpenGroup(openGroup === group.id ? null : group.id)
                    }
                  >
                    <ChevronDown
                      className={`h-4 w-4 ${openGroup === group.id ? "rotate-180" : ""}`}
                    />
                    <div>
                      <b>{group.name}</b>
                      <p className="text-xs text-muted-foreground">
                        {group.options.length} خيارات ·{" "}
                        {group.required ? "مطلوب" : "اختياري"} · من{" "}
                        {group.minSelections} إلى {group.maxSelections}
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingId(group.id);
                        setForm({
                          name: group.name,
                          required: group.required,
                          min: String(group.minSelections),
                          max: String(group.maxSelections),
                          options: group.options
                            .map(
                              (option) =>
                                `${option.name} | ${option.priceAdjustment}`,
                            )
                            .join("\n"),
                          productIds: group.productIds,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setRemoveId(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {openGroup === group.id ? (
                  <div className="grid gap-2 border-t bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        className="flex justify-between rounded-lg border bg-card p-3 text-sm"
                        onClick={() => toggleOption(group.id, option.id)}
                      >
                        <span>
                          {option.name}{" "}
                          {option.priceAdjustment
                            ? `+${option.priceAdjustment}`
                            : ""}
                        </span>
                        <Badge variant="outline">
                          {option.available ? "متاح" : "غير متاح"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {!groups.length ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              لا توجد مجموعات إضافات حتى الآن.
            </div>
          ) : null}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "تعديل مجموعة خيارات" : "إضافة مجموعة خيارات"}
              </DialogTitle>
              <DialogDescription>
                اكتب كل خيار في سطر بالشكل: الاسم | فرق السعر.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="اسم المجموعة"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">
                الحد الأدنى
                <Input
                  type="number"
                  min="0"
                  value={form.min}
                  onChange={(e) => setForm({ ...form, min: e.target.value })}
                />
              </label>
              <label className="text-sm font-bold">
                الحد الأقصى
                <Input
                  type="number"
                  min="1"
                  value={form.max}
                  onChange={(e) => setForm({ ...form, max: e.target.value })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) =>
                  setForm({ ...form, required: e.target.checked })
                }
              />
              مجموعة مطلوبة
            </label>
            <textarea
              className="min-h-28 rounded-md border bg-background p-3 text-sm"
              placeholder={"صغير | 0\nوسط | 10\nكبير | 20"}
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
            />
            <div>
              <p className="mb-2 text-sm font-bold">المنتجات المرتبطة</p>
              <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 rounded border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          productIds: e.target.checked
                            ? [...form.productIds, product.id]
                            : form.productIds.filter((id) => id !== product.id),
                        })
                      }
                    />
                    {product.name}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={save}>حفظ المجموعة</Button>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={Boolean(removeId)}
          onOpenChange={(value) => !value && setRemoveId(null)}
          title="حذف مجموعة الخيارات؟"
          description="لن تتأثر لقطات الخيارات المحفوظة داخل الطلبات السابقة."
          confirmLabel="حذف"
          onConfirm={remove}
        />
      </section>
    </AdminShell>
  );
}

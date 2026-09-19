"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
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
import { cafeDataService } from "@/services/cafe-data.service";
import { inventoryApiService } from "@/services/inventory-api.service";
import type { InventoryItem, Recipe } from "@/types/cafe-operations.types";
import type { Product } from "@/types/product.types";

const empty = { productId: "", inventoryItemId: "", quantity: "", unit: "" };
export default function RecipesPage() {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const reload = () => {
    void inventoryApiService.list<Recipe>("recipes").then(setRecipes).catch(() => setRecipes([]));
    setProducts(cafeDataService.getProducts());
    void inventoryApiService.list<InventoryItem>("inventory").then((items) => setInventory(items.filter((item) => item.active))).catch(() => setInventory([]));
  };
  useEffect(() => {
    reload();
    const handler = () => {
      setOpen(false);
      setForm(empty);
      reload();
    };
    window.addEventListener("tenant:changed", handler);
    window.addEventListener("branch:changed", handler);
    return () => {
      window.removeEventListener("tenant:changed", handler);
      window.removeEventListener("branch:changed", handler);
    };
  }, []);
  const productName = (id: string) =>
    products.find((item) => item.id === id)?.name ?? "منتج غير موجود";
  async function save() {
    const quantity = Number(form.quantity);
    const item = inventory.find((entry) => entry.id === form.inventoryItemId);
    if (!form.productId || !item)
      return toast.error("اختر المنتج ومكون المخزون.");
    if (!Number.isFinite(quantity) || quantity <= 0)
      return toast.error("كمية المكون يجب أن تكون أكبر من صفر.");
    try {
      const existing = recipes.find(
        (recipe) => recipe.productId === form.productId,
      );
      if (existing) return toast.error("يوجد وصفة لهذا المنتج بالفعل.");
      await inventoryApiService.create<Recipe>("recipes", {
        productId: form.productId,
        ingredients: [
          { inventoryItemId: item.id, quantity, unit: form.unit || item.unit },
        ],
      });
      setOpen(false);
      setForm(empty);
      reload();
      toast.success("تم حفظ الوصفة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الوصفة.");
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
            <p className="text-xs font-bold text-accent">إدارة المنيو</p>
            <h1 className="mt-1 text-2xl font-black">الوصفات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              الوصفات على مستوى الكافيه، وتكلفتها محسوبة من متوسط تكلفة مخزون
              الفرع الحالي.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة وصفة
          </Button>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[650px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "المنتج",
                    "عدد المكونات",
                    "التكلفة المقدرة",
                    "سعر البيع",
                    "هامش الربح",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => {
                  const cost = recipe.ingredients.reduce((sum, ingredient) => sum + (inventory.find((item) => item.id === ingredient.inventoryItemId)?.averageCost ?? 0) * ingredient.quantity, 0);
                  const price =
                    products.find((item) => item.id === recipe.productId)
                      ?.price ?? 0;
                  return (
                    <tr key={recipe.id} className="border-t">
                      <td className="px-4 py-3 font-bold">
                        {productName(recipe.productId)}
                      </td>
                      <td className="px-4 py-3">{recipe.ingredients.length}</td>
                      <td className="px-4 py-3">
                        {formatMoney(cost, tenant.settings.currencySymbol)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(price, tenant.settings.currencySymbol)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(
                          price - cost,
                          tenant.settings.currencySymbol,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!recipes.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد وصفات حتى الآن.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إضافة وصفة</DialogTitle>
              <DialogDescription>
                أضف المكون الأساسي الآن؛ يمكن توسيع الوصفة لاحقًا من التعديل.
              </DialogDescription>
            </DialogHeader>
            <label className="text-sm font-semibold">
              المنتج *
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={form.productId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    productId: event.target.value,
                  }))
                }
              >
                <option value="">اختر المنتج</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              مكون المخزون *
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                value={form.inventoryItemId}
                onChange={(event) => {
                  const item = inventory.find(
                    (entry) => entry.id === event.target.value,
                  );
                  setForm((current) => ({
                    ...current,
                    inventoryItemId: event.target.value,
                    unit: item?.unit ?? "",
                  }));
                }}
              >
                <option value="">اختر المكون</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.unit}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                الكمية *
                <Input
                  className="mt-1"
                  type="number"
                  min="0.001"
                  step="0.001"
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
                الوحدة
                <Input
                  className="mt-1"
                  value={form.unit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <Button onClick={save}>حفظ الوصفة</Button>
          </DialogContent>
        </Dialog>
      </section>
    </AdminShell>
  );
}

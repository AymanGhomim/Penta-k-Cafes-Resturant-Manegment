"use client";

import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/access/permission-gate";
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
import { cafeOperationsService } from "@/services/cafe-operations.service";
import { catalogApiService } from "@/services/catalog-api.service";
import type { Category } from "@/types/category.types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState(cafeDataService.getProducts());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const reload = async () => {
    try {
      const [remoteCategories, remoteProducts] = await Promise.all([
        catalogApiService.listCategories(),
        catalogApiService.listProducts(),
      ]);
      setCategories(remoteCategories);
      setProducts(remoteProducts);
    } catch {
      setCategories(cafeDataService.getCategories());
      setProducts(cafeDataService.getProducts());
    }
  };
  useEffect(() => {
    reload();
    const handler = () => void reload();
    window.addEventListener("tenant:changed", handler);
    return () => window.removeEventListener("tenant:changed", handler);
  }, []);
  const update = async (next: Category[]) => {
    setCategories(next);
    cafeDataService.saveCategories(next);
  };
  const count = (id: string) =>
    products.filter((product) => product.categoryId === id).length;
  const saveCategory = async () => {
    if (!name.trim()) return toast.error("اسم القسم مطلوب.");
    if (editingCategory) {
      const nextCategory = { ...editingCategory, name: name.trim() };
      try {
        const saved = await catalogApiService.updateCategory(editingCategory.id, { name: name.trim() });
        setCategories((current) => current.map((item) => item.id === editingCategory.id ? saved : item));
      } catch {
        await update(categories.map((item) => item.id === editingCategory.id ? nextCategory : item));
      }
      setEditingCategory(null);
      setName("");
      setOpen(false);
      toast.success("تم تعديل القسم.");
      return;
    }
    let category: Category;
    try {
      category = await catalogApiService.createCategory({
        name: name.trim(),
        sortOrder: categories.length + 1,
        isActive: true,
      });
    } catch {
      category = {
        id: `cat-${Date.now()}`,
        name: name.trim(),
        sortOrder: categories.length + 1,
        isActive: true,
      };
    }
    await update([...categories, category]);
    cafeOperationsService.audit({
      module: "categories",
      action: "CATEGORY_CREATED",
      description: `تمت إضافة القسم ${category.name}`,
      entityType: "category",
      entityId: category.id,
    });
    setName("");
    setOpen(false);
    toast.success("تمت إضافة القسم.");
  };
  const toggleCategory = async (category: Category) => {
    const isActive = !category.isActive;
    try {
      const saved = await catalogApiService.updateCategory(category.id, { isActive });
      setCategories((current) => current.map((item) => item.id === category.id ? saved : item));
    } catch {
      await update(categories.map((item) => item.id === category.id ? { ...item, isActive } : item));
    }
    toast.success(isActive ? "تم تفعيل القسم." : "تم تعطيل القسم.");
  };
  const deleteCategory = async () => {
    if (!deleteTarget) return;
    if (count(deleteTarget.id))
      return void toast.error(
        "لا يمكن حذف قسم مرتبط بمنتجات. انقل المنتجات أولًا.",
      );
    try {
      await catalogApiService.deleteCategory(deleteTarget.id);
    } catch {
      // Keep the local fallback behavior for demo tenants.
    }
    await update(categories.filter((item) => item.id !== deleteTarget.id));
    cafeOperationsService.audit({
      module: "categories",
      action: "CATEGORY_DELETED",
      description: `تم حذف القسم ${deleteTarget.name}`,
      entityType: "category",
      entityId: deleteTarget.id,
    });
    setDeleteTarget(null);
    toast.success("تم حذف القسم.");
  };
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">إدارة المنيو</p>
            <h1 className="mt-1 text-2xl font-black">الأقسام</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة أقسام الكافيه الحالي فقط.
            </p>
          </div>
          <PermissionGate permission="categories.manage"><Button
            type="button"
            className="h-10 rounded-lg"
            onClick={() => { setEditingCategory(null); setName(""); setOpen(true); }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة قسم
          </Button></PermissionGate>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="إجمالي الأقسام"
            value={categories.length}
            icon={GripVertical}
          />
          <AdminStatCard
            label="الأقسام النشطة"
            value={categories.filter((item) => item.isActive).length}
            icon={GripVertical}
          />
          <AdminStatCard
            label="إجمالي المنتجات"
            value={products.length}
            icon={GripVertical}
          />
        </div>
        <Card className="overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "الاسم",
                      "عدد المنتجات",
                      "ترتيب العرض",
                      "الحالة",
                      "الإجراءات",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-bold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => (
                    <tr key={category.id} className="border-t">
                      <td className="px-4 py-4 font-bold">{category.name}</td>
                      <td className="px-4 py-4">{count(category.id)} منتجات</td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {category.sortOrder || index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          className={
                            category.isActive
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {category.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <PermissionGate permission="categories.manage"><div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => void toggleCategory(category)}
                          >
                            {category.isActive ? "تعطيل" : "تفعيل"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => { setEditingCategory(category); setName(category.name); setOpen(true); }}
                          >
                            تعديل
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(category)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div></PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!categories.length ? (
                <div className="border-t p-12 text-center text-sm text-muted-foreground">
                  لا توجد أقسام لهذا الكافيه حتى الآن.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "تعديل القسم" : "إضافة قسم"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "عدّل اسم القسم ثم احفظ التغييرات." : "أدخل اسم القسم وسيضاف في نهاية ترتيب العرض."}
              </DialogDescription>
            </DialogHeader>
            <label className="text-sm font-semibold">
              اسم القسم *
              <Input
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <Button onClick={() => void saveCategory()}>{editingCategory ? "حفظ التعديل" : "حفظ القسم"}</Button>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(value) => !value && setDeleteTarget(null)}
          title="حذف القسم؟"
          description="لن يمكن حذف القسم إذا كان مرتبطًا بمنتجات."
          confirmLabel="حذف"
          onConfirm={deleteCategory}
        />
      </section>
    </AdminShell>
  );
}

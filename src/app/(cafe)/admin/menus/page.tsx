"use client";
import { useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/access/permission-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/providers/tenant-provider";
import { branchService } from "@/services/branch.service";
import { cafeDataService } from "@/services/cafe-data.service";
import { catalogApiService } from "@/services/catalog-api.service";
import { menuApiService } from "@/services/menu-api.service";
import type { Menu } from "@/types/branch.types";

type DraftItem = {
  productId: string;
  price: number;
  available: boolean;
  sortOrder: number;
};
export default function MenusPage() {
  const { tenant } = useTenant();
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Menu | "new" | null>(null);
  const [menus, setMenus] = useState<Menu[]>(() => branchService.getMenus(tenant.id));
  const branches = branchService.getBranches(tenant.id);
  const [products, setProducts] = useState(cafeDataService.getProducts());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [menuStatus, setMenuStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [items, setItems] = useState<DraftItem[]>([]);
  useEffect(() => {
    void Promise.all([menuApiService.list(), catalogApiService.listProducts()])
      .then(([remoteMenus, remoteProducts]) => { setMenus(remoteMenus); setProducts(remoteProducts); })
      .catch(() => undefined);
  }, [revision]);
  const usage = useMemo(
    () =>
      new Map(
        menus.map((menu) => [
          menu.id,
          branches.filter((branch) => branch.menuId === menu.id),
        ]),
      ),
    [branches, menus],
  );
  const refresh = () => setRevision((value) => value + 1);
  void revision;
  const open = async (menu?: Menu) => {
    setEditing(menu ?? "new");
    setName(menu?.name ?? "");
    setDescription(menu?.description ?? "");
    setMenuStatus(menu?.status ?? "ACTIVE");
    if (!menu) return setItems([]);
    try {
      const remoteItems = await menuApiService.listItems(menu.id);
      setItems(remoteItems.map(({ productId, price, available, sortOrder }) => ({ productId, price, available, sortOrder })));
    } catch {
      setItems(branchService.getMenuItems(menu.id, tenant.id).map(({ productId, price, available, sortOrder }) => ({ productId, price, available, sortOrder })));
    }
  };
  const toggle = (productId: string, basePrice: number) =>
    setItems((current) =>
      current.some((item) => item.productId === productId)
        ? current.filter((item) => item.productId !== productId)
        : [
            ...current,
            {
              productId,
              price: basePrice,
              available: true,
              sortOrder: current.length + 1,
            },
          ],
    );
  const save = async () => {
    if (!name.trim()) return toast.error("اسم المنيو مطلوب");
    try {
      const savedMenu = editing === "new"
        ? await menuApiService.create({ name: name.trim(), description: description.trim(), status: menuStatus })
        : editing
          ? await menuApiService.update(editing.id, { name: name.trim(), description: description.trim(), status: menuStatus })
          : null;
      if (savedMenu) {
        if (editing !== "new") {
          const existingItems = await menuApiService.listItems(savedMenu.id);
          await Promise.all(existingItems.map((item) => menuApiService.removeItem(savedMenu.id, item.id)));
        }
        await Promise.all(items.map((item) => menuApiService.createItem(savedMenu.id, item)));
      }
    } catch {
      if (editing === "new") branchService.createMenu({ name, description, status: menuStatus }, items, tenant.id);
      else if (editing) branchService.updateMenu(editing.id, { name, description, status: menuStatus }, items, tenant.id);
    }
    setEditing(null);
    refresh();
    toast.success("تم حفظ المنيو");
  };
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">إدارة المنيو</p>
            <h1 className="mt-1 text-2xl font-black">المنيوهات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              منيوهات قابلة لإعادة الاستخدام بأسعار وتوفر مستقلين.
            </p>
          </div>
          <PermissionGate permission="menus.manage"><Button onClick={() => open()}>
            <Plus className="ml-2 h-4 w-4" />
            إنشاء منيو
          </Button></PermissionGate>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "اسم المنيو",
                    "عدد المنتجات",
                    "الفروع المستخدمة",
                    "الحالة",
                    "آخر تحديث",
                    "الإجراءات",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menus.map((menu) => (
                  <tr key={menu.id} className="border-t">
                    <td className="px-4 py-3 font-bold">{menu.name}</td>
                    <td className="px-4 py-3">
                      {branchService.getMenuItems(menu.id, tenant.id).length}
                    </td>
                    <td className="px-4 py-3">
                      مستخدم في {usage.get(menu.id)?.length ?? 0} فرع
                    </td>
                    <td className="px-4 py-3">
                      <Badge>
                        {menu.status === "ACTIVE" ? "نشط" : "متوقف"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(menu.updatedAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <PermissionGate permission="menus.manage"><div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => open(menu)}
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => void (async () => {
                            try {
                              const copied = await menuApiService.create({ name: `${menu.name} - نسخة`, description: menu.description, status: menu.status });
                              const sourceItems = await menuApiService.listItems(menu.id);
                              await Promise.all(sourceItems.map(({ productId, price, available, sortOrder }) => menuApiService.createItem(copied.id, { productId, price, available, sortOrder })));
                            } catch {
                              branchService.duplicateMenu(menu.id, `${menu.name} - نسخة`, tenant.id);
                            }
                            refresh();
                            toast.success("تم نسخ المنيو");
                          })()}
                          aria-label="نسخ"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive"
                          onClick={() => void (async () => {
                            try {
                              await menuApiService.remove(menu.id);
                              refresh();
                              toast.success("تم حذف المنيو");
                            } catch (error) {
                              try {
                                branchService.removeMenu(menu.id, tenant.id);
                                refresh();
                                toast.success("تم حذف المنيو");
                              } catch (fallbackError) {
                                toast.error(fallbackError instanceof Error ? fallbackError.message : error instanceof Error ? error.message : "تعذر الحذف");
                              }
                            }
                          })()}
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div></PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-background p-6">
              <h2 className="text-xl font-black">
                {editing === "new" ? "إنشاء منيو" : "تعديل المنيو"}
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  اسم المنيو
                  <Input
                    className="mt-2"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="text-sm font-bold">
                  الوصف
                  <Input
                    className="mt-2"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                <label className="text-sm font-bold sm:col-span-2">الحالة
                  <select value={menuStatus} onChange={(event) => setMenuStatus(event.target.value as "ACTIVE" | "INACTIVE")} className="mt-2 h-10 w-full rounded-lg border bg-background px-3"><option value="ACTIVE">نشط</option><option value="INACTIVE">متوقف</option></select>
                </label>
              </div>
              <div className="mt-5 rounded-xl border">
                <div className="border-b p-4 font-black">
                  منتجات الكتالوج والأسعار
                </div>
                {products.map((product) => {
                  const item = items.find(
                    (entry) => entry.productId === product.id,
                  );
                  return (
                    <div
                      key={product.id}
                      className="grid items-center gap-3 border-b p-3 sm:grid-cols-[1fr_150px_120px]"
                    >
                      <label className="flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={Boolean(item)}
                          onChange={() => toggle(product.id, product.price)}
                        />
                        {product.name}
                      </label>
                      <Input
                        type="number"
                        disabled={!item}
                        value={item?.price ?? product.price}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.productId === product.id
                                ? {
                                    ...entry,
                                    price: Number(event.target.value),
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={!item}
                          checked={item?.available ?? false}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((entry) =>
                                entry.productId === product.id
                                  ? {
                                      ...entry,
                                      available: event.target.checked,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        متاح
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  إلغاء
                </Button>
                <Button onClick={save}>حفظ المنيو</Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}

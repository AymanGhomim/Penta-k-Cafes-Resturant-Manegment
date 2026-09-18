"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PermissionGate } from "@/components/access/permission-gate";
import { AdminShell } from "@/components/admin/admin-shell";
import { AppNotFoundState } from "@/components/feedback/app-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBranch } from "@/providers/branch-provider";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { useTenant } from "@/providers/tenant-provider";
import { branchService } from "@/services/branch.service";
import { branchApiService } from "@/services/branch-api.service";
import { cafeDataService } from "@/services/cafe-data.service";
import { cafeOperationsService } from "@/services/cafe-operations.service";
import type { BranchSettings, BranchStatus, MenuItem } from "@/types/branch.types";
import type { Table } from "@/types/table.types";

type Tab = "overview" | "menu" | "operations" | "tables" | "settings";
type MenuDraftItem = Pick<MenuItem, "productId" | "price" | "available" | "sortOrder">;

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "menu", label: "المنيو" },
  { id: "operations", label: "التشغيل" },
  { id: "tables", label: "الطاولات" },
  { id: "settings", label: "كل إعدادات الفرع" },
];

const branchModules = [
  ["إدارة المنيوهات", "/admin/menus"],
  ["المنتجات", "/admin/products"],
  ["الأقسام", "/admin/categories"],
  ["الإضافات والخيارات", "/admin/addons"],
  ["الوصفات", "/admin/recipes"],
  ["العروض", "/admin/offers"],
  ["إعدادات المنيو الإلكتروني", "/admin/menu-settings"],
  ["مناطق التوصيل", "/admin/delivery-zones"],
  ["الطاولات", "/admin/tables"],
  ["رموز QR", "/admin/qr"],
  ["الطلبات", "/admin/orders"],
  ["المخزون", "/admin/inventory"],
  ["الموظفون", "/admin/employees"],
  ["التقارير", "/admin/reports"],
  ["الإعدادات العامة", "/admin/settings"],
] as const;

export default function BranchDetailsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { tenant } = useTenant();
  const { refreshBranches } = useBranch();
  const access = useCurrentEmployee();
  const [revision, setRevision] = useState(0);
  const [remoteBranch, setRemoteBranch] = useState<Awaited<ReturnType<typeof branchApiService.find>> | null>(null);
  useEffect(() => {
    void branchApiService.find(branchId).then(setRemoteBranch).catch(() => undefined);
  }, [branchId]);
  const branch = remoteBranch ?? branchService.getBranch(branchId, tenant.id);
  const menus = branchService.getMenus(tenant.id);
  const products = cafeDataService.getProducts();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(
    search.get("edit") === "1" && access.hasPermission("branches.manage"),
  );
  const [deleteTable, setDeleteTable] = useState<Table | null>(null);
  const [form, setForm] = useState({
    name: branch?.name ?? "",
    code: branch?.code ?? "",
    phone: branch?.phone ?? "",
    email: branch?.email ?? "",
    address: branch?.address ?? "",
    status: (branch?.status ?? "ACTIVE") as BranchStatus,
    menuId: branch?.menuId ?? "",
  });
  const [operations, setOperations] = useState<BranchSettings>({
    dineInEnabled: branch?.settings?.dineInEnabled ?? true,
    takeawayEnabled: branch?.settings?.takeawayEnabled ?? true,
    deliveryEnabled: branch?.settings?.deliveryEnabled ?? true,
    preparationTime: branch?.settings?.preparationTime ?? 20,
    openingHours: branch?.settings?.openingHours ?? "09:00 - 23:00",
  });
  const currentMenu = menus.find((menu) => menu.id === form.menuId);
  const [menuName, setMenuName] = useState(currentMenu?.name ?? "");
  const [menuDescription, setMenuDescription] = useState(
    currentMenu?.description ?? "",
  );
  const [menuStatus, setMenuStatus] = useState<"ACTIVE" | "INACTIVE">(
    currentMenu?.status ?? "ACTIVE",
  );
  const [menuItems, setMenuItems] = useState<MenuDraftItem[]>(
    currentMenu
      ? branchService.getMenuItems(currentMenu.id, tenant.id).map(
          ({ productId, price, available, sortOrder }) => ({
            productId,
            price,
            available,
            sortOrder,
          }),
        )
      : [],
  );
  const [tablesList, setTablesList] = useState<Table[]>(
    cafeDataService.getTablesForBranch(branchId, tenant.id),
  );
  void revision;

  const menuItemsByProduct = useMemo(
    () => new Map(menuItems.map((item) => [item.productId, item])),
    [menuItems],
  );

  if (!branch) {
    return (
      <AdminShell>
        <AppNotFoundState
          variant="cafe"
          description="تعذر العثور على الفرع المطلوب داخل هذا الكافيه."
          actionHref="/admin/branches"
          actionLabel="العودة إلى الفروع"
        />
      </AdminShell>
    );
  }
  const currentBranch = branch;

  function refresh() {
    setRevision((value) => value + 1);
    refreshBranches();
  }

  function loadMenu(menuId: string) {
    setForm((current) => ({ ...current, menuId }));
    const menu = menus.find((item) => item.id === menuId);
    setMenuName(menu?.name ?? "");
    setMenuDescription(menu?.description ?? "");
    setMenuStatus(menu?.status ?? "ACTIVE");
    setMenuItems(
      menu
        ? branchService.getMenuItems(menu.id, tenant.id).map(
            ({ productId, price, available, sortOrder }) => ({
              productId,
              price,
              available,
              sortOrder,
            }),
          )
        : [],
    );
  }

  async function saveOverview() {
    if (!form.name.trim()) return toast.error("اسم الفرع مطلوب.");
    if (!form.address.trim()) return toast.error("عنوان الفرع مطلوب.");
    try {
      const saved = await branchApiService.update(currentBranch.id, {
        name: form.name.trim(),
        code: form.code.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        status: form.status,
      });
      setRemoteBranch(saved);
    } catch {
      branchService.updateBranch(currentBranch.id, { name: form.name.trim(), code: form.code.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), status: form.status, menuId: form.menuId || undefined }, tenant.id);
    }
    refresh();
    setEditing(false);
    toast.success("تم حفظ كل البيانات الأساسية للفرع.");
  }

  function saveMenu() {
    if (!access.hasPermission("branches.manage")) {
      return toast.error("ليس لديك صلاحية تعديل إعدادات الفرع.");
    }
    if (form.menuId && !access.hasPermission("menus.manage")) {
      return toast.error("ليس لديك صلاحية تعديل المنيو.");
    }
    if (!form.menuId) {
      branchService.updateBranch(currentBranch.id, { menuId: undefined }, tenant.id);
      refresh();
      return toast.success("تم إلغاء ربط المنيو بهذا الفرع.");
    }
    if (!menuName.trim()) return toast.error("اسم المنيو مطلوب.");
    branchService.updateMenu(
      form.menuId,
      {
        name: menuName.trim(),
        description: menuDescription.trim(),
        status: menuStatus,
      },
      menuItems,
      tenant.id,
    );
    branchService.updateBranch(currentBranch.id, { menuId: form.menuId }, tenant.id);
    refresh();
    toast.success("تم حفظ منيو الفرع والأسعار والتوفر.");
  }

  function saveOperations() {
    if (!access.hasPermission("branches.manage")) {
      return toast.error("ليس لديك صلاحية تعديل إعدادات الفرع.");
    }
    if (
      !Number.isFinite(operations.preparationTime) ||
      operations.preparationTime < 1
    )
      return toast.error("مدة التحضير يجب أن تكون دقيقة واحدة على الأقل.");
    branchService.updateBranch(currentBranch.id, { settings: operations }, tenant.id);
    refresh();
    toast.success("تم حفظ إعدادات تشغيل الفرع.");
  }

  function persistTables(next: Table[]) {
    cafeDataService.saveTablesForBranch(currentBranch.id, next, tenant.id);
    setTablesList(next);
    window.dispatchEvent(new Event("tables:changed"));
  }

  function openModule(path: string) {
    branchService.setActiveBranch(currentBranch.id, tenant.id);
    refreshBranches();
    router.push(path);
  }

  return (
    <AdminShell>
      <section dir="rtl" className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold text-accent">إدارة الفروع</p>
            <h1 className="mt-1 text-2xl font-black">{branch.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{branch.status === "ACTIVE" ? "نشط" : "متوقف"}</Badge>
              <Badge variant="outline">
                {menus.find((menu) => menu.id === branch.menuId)?.name ??
                  "بدون منيو"}
              </Badge>
            </div>
          </div>
          <PermissionGate permission="branches.manage">
            <Button variant="outline" onClick={() => setEditing((value) => !value)}>
              {editing ? "إلغاء التعديل" : "تعديل البيانات الأساسية"}
            </Button>
          </PermissionGate>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto border-b pb-3 text-sm font-bold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <Card>
            <CardHeader><CardTitle>البيانات الأساسية</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الفرع" value={form.name} disabled={!editing} onChange={(name) => setForm({ ...form, name })} />
              <Field label="الكود" value={form.code} disabled={!editing} onChange={(code) => setForm({ ...form, code })} />
              <Field label="الهاتف" value={form.phone} disabled={!editing} onChange={(phone) => setForm({ ...form, phone })} />
              <Field label="البريد الإلكتروني" type="email" value={form.email} disabled={!editing} onChange={(email) => setForm({ ...form, email })} />
              <div className="sm:col-span-2"><Field label="العنوان" value={form.address} disabled={!editing} onChange={(address) => setForm({ ...form, address })} /></div>
              <SelectField label="المنيو الحالي" value={form.menuId} disabled={!editing} onChange={loadMenu} options={[{ value: "", label: "بدون منيو" }, ...menus.map((menu) => ({ value: menu.id, label: menu.name }))]} />
              <SelectField label="الحالة" value={form.status} disabled={!editing} onChange={(status) => setForm({ ...form, status: status as BranchStatus })} options={[{ value: "ACTIVE", label: "نشط" }, { value: "INACTIVE", label: "متوقف" }]} />
              {editing ? <Button className="sm:col-span-2" onClick={saveOverview}><Save className="ml-2 h-4 w-4" />حفظ البيانات الأساسية</Button> : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "menu" ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>منيو الفرع</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <SelectField label="اختيار المنيو" value={form.menuId} disabled={!access.hasPermission("branches.manage")} onChange={loadMenu} options={[{ value: "", label: "بدون منيو" }, ...menus.map((menu) => ({ value: menu.id, label: menu.name }))]} />
                <Field label="اسم المنيو" value={menuName} disabled={!form.menuId || !access.hasPermission("menus.manage")} onChange={setMenuName} />
                <div className="sm:col-span-2"><Field label="وصف المنيو" value={menuDescription} disabled={!form.menuId || !access.hasPermission("menus.manage")} onChange={setMenuDescription} /></div>
                <SelectField label="حالة المنيو" value={menuStatus} disabled={!form.menuId || !access.hasPermission("menus.manage")} onChange={(value) => setMenuStatus(value as "ACTIVE" | "INACTIVE")} options={[{ value: "ACTIVE", label: "نشط" }, { value: "INACTIVE", label: "متوقف" }]} />
              </CardContent>
            </Card>
            {form.menuId ? (
              <Card>
                <CardHeader><CardTitle>المنتجات والأسعار والتوفر داخل هذا المنيو</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead className="bg-muted/50"><tr><th className="p-3">المنتج</th><th className="p-3">السعر الأساسي</th><th className="p-3">سعر الفرع</th><th className="p-3">داخل المنيو</th><th className="p-3">متاح</th><th className="p-3">الترتيب</th></tr></thead>
                    <tbody>{products.map((product) => {
                      const item = menuItemsByProduct.get(product.id);
                      const canManage = access.hasPermission("menus.manage");
                      return <tr key={product.id} className="border-t"><td className="p-3 font-bold">{product.name}</td><td className="p-3">{product.price}</td><td className="p-3"><Input type="number" className="w-28" disabled={!item || !canManage} value={item?.price ?? product.price} onChange={(event) => setMenuItems((current) => current.map((entry) => entry.productId === product.id ? { ...entry, price: Number(event.target.value) } : entry))} /></td><td className="p-3"><input type="checkbox" disabled={!canManage} checked={Boolean(item)} onChange={(event) => setMenuItems((current) => event.target.checked ? [...current, { productId: product.id, price: product.price, available: true, sortOrder: current.length + 1 }] : current.filter((entry) => entry.productId !== product.id))} /></td><td className="p-3"><input type="checkbox" disabled={!item || !canManage} checked={item?.available ?? false} onChange={(event) => setMenuItems((current) => current.map((entry) => entry.productId === product.id ? { ...entry, available: event.target.checked } : entry))} /></td><td className="p-3"><Input type="number" className="w-20" disabled={!item || !canManage} value={item?.sortOrder ?? 0} onChange={(event) => setMenuItems((current) => current.map((entry) => entry.productId === product.id ? { ...entry, sortOrder: Number(event.target.value) } : entry))} /></td></tr>;
                    })}</tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}
            <PermissionGate anyOf={["branches.manage", "menus.manage"]}><Button className="w-full" onClick={saveMenu}><Save className="ml-2 h-4 w-4" />حفظ منيو الفرع</Button></PermissionGate>
          </div>
        ) : null}

        {activeTab === "operations" ? (
          <Card>
            <CardHeader><CardTitle>إعدادات تشغيل الفرع</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Toggle label="الطلبات داخل الكافيه" checked={operations.dineInEnabled} disabled={!access.hasPermission("branches.manage")} onChange={(dineInEnabled) => setOperations({ ...operations, dineInEnabled })} />
              <Toggle label="طلبات التيك أواي" checked={operations.takeawayEnabled} disabled={!access.hasPermission("branches.manage")} onChange={(takeawayEnabled) => setOperations({ ...operations, takeawayEnabled })} />
              <Toggle label="طلبات التوصيل" checked={operations.deliveryEnabled} disabled={!access.hasPermission("branches.manage")} onChange={(deliveryEnabled) => setOperations({ ...operations, deliveryEnabled })} />
              <Field label="متوسط مدة التحضير بالدقائق" type="number" value={String(operations.preparationTime)} disabled={!access.hasPermission("branches.manage")} onChange={(value) => setOperations({ ...operations, preparationTime: Number(value) })} />
              <div className="sm:col-span-2"><Field label="ساعات العمل" value={operations.openingHours ?? ""} disabled={!access.hasPermission("branches.manage")} onChange={(openingHours) => setOperations({ ...operations, openingHours })} /></div>
              <PermissionGate permission="branches.manage"><Button className="sm:col-span-2" onClick={saveOperations}><Save className="ml-2 h-4 w-4" />حفظ إعدادات التشغيل</Button></PermissionGate>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "tables" ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle>طاولات الفرع</CardTitle><PermissionGate permission="tables.manage"><Button onClick={() => { const number = tablesList.reduce((max, table) => Math.max(max, table.number), 0) + 1; persistTables([...tablesList, { id: `tbl-${Date.now()}`, tenantId: tenant.id, branchId: currentBranch.id, number, qrCode: `qr-${currentBranch.code || currentBranch.id}-${number}`, isActive: true }]); toast.success("تمت إضافة طاولة للفرع."); }}><Plus className="ml-2 h-4 w-4" />إضافة طاولة</Button></PermissionGate></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tablesList.map((table) => <div key={table.id} className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><b>طاولة {table.number}</b><Badge variant={table.isActive ? "default" : "secondary"}>{table.isActive ? "نشطة" : "متوقفة"}</Badge></div><div className="space-y-3"><Field label="رقم الطاولة" type="number" value={String(table.number)} disabled={!access.hasPermission("tables.manage")} onChange={(value) => persistTables(tablesList.map((item) => item.id === table.id ? { ...item, number: Number(value) } : item))} /><Field label="كود QR" value={table.qrCode} disabled={!access.hasPermission("tables.manage")} onChange={(qrCode) => persistTables(tablesList.map((item) => item.id === table.id ? { ...item, qrCode } : item))} /><PermissionGate permission="tables.manage"><div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => persistTables(tablesList.map((item) => item.id === table.id ? { ...item, isActive: !item.isActive } : item))}>{table.isActive ? "إيقاف" : "تفعيل"}</Button><Button variant="outline" size="icon" onClick={() => setDeleteTable(table)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></PermissionGate></div></div>)}
              {!tablesList.length ? <p className="sm:col-span-2 lg:col-span-3 rounded-xl border border-dashed p-10 text-center text-muted-foreground">لا توجد طاولات في هذا الفرع.</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "settings" ? (
          <Card>
            <CardHeader><CardTitle>إدارة كل محتوى الفرع</CardTitle><p className="text-sm text-muted-foreground">اختيار أي قسم سيجعل هذا الفرع هو الفرع الحالي ثم يفتح شاشة الإدارة الكاملة الخاصة به.</p></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {branchModules.map(([label, path]) => <Button key={path} variant="outline" className="h-12 justify-between" onClick={() => openModule(path)}><span>{label}</span><ExternalLink className="h-4 w-4" /></Button>)}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <ConfirmDialog open={Boolean(deleteTable)} onOpenChange={(value) => !value && setDeleteTable(null)} title="حذف الطاولة؟" description="سيتم حذف الطاولة من هذا الفرع فقط." confirmLabel="حذف" onConfirm={() => { if (!deleteTable) return; persistTables(tablesList.filter((table) => table.id !== deleteTable.id)); cafeOperationsService.audit({ module: "tables", action: "TABLE_DELETED", description: `تم حذف الطاولة ${deleteTable.number} من ${currentBranch.name}`, entityType: "table", entityId: deleteTable.id }); setDeleteTable(null); toast.success("تم حذف الطاولة."); }} />
    </AdminShell>
  );
}

function Field({ label, value, disabled, onChange, type = "text" }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm font-bold">{label}<Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2" /></label>;
}

function SelectField({ label, value, disabled, options, onChange }: { label: string; value: string; disabled: boolean; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="text-sm font-bold">{label}<select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-background px-3 disabled:opacity-70">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 disabled:opacity-50" /></label>;
}

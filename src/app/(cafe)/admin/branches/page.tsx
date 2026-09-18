"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Eye, MapPin, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { PermissionGate } from "@/components/access/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranch } from "@/providers/branch-provider";
import { branchService, getEffectiveBranchLimit } from "@/services/branch.service";
import { branchApiService } from "@/services/branch-api.service";
import { useTenant } from "@/providers/tenant-provider";

export default function BranchesPage() {
  const { tenant } = useTenant();
  const { branches, refreshBranches } = useBranch();
  const limit = getEffectiveBranchLimit(tenant);
  const canAdd = branches.length < limit;
  const menus = branchService.getMenus(tenant.id);
  const menuNames = useMemo(() => new Map(menus.map((menu) => [menu.id, menu.name])), [menus]);
  const toggle = async (id: string, active: boolean) => {
    try {
      await branchApiService.updateStatus(id, active);
    } catch {
      branchService.updateBranch(id, { status: active ? "ACTIVE" : "INACTIVE" }, tenant.id);
    }
    refreshBranches();
    toast.success(active ? "تم تفعيل الفرع" : "تم تعطيل الفرع");
  };
  return <AdminShell><section dir="rtl" className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold text-accent">الإدارة</p><h1 className="mt-1 text-2xl font-black">الفروع</h1><p className="mt-1 text-sm text-muted-foreground">إدارة مواقع التشغيل والمنيو المخصصة لكل فرع.</p></div><PermissionGate permission="branches.manage"><Button asChild={canAdd} disabled={!canAdd}>{canAdd ? <Link href="/admin/branches/new"><Plus className="ml-2 h-4 w-4" />إضافة فرع</Link> : <span><Plus className="ml-2 h-4 w-4" />إضافة فرع</span>}</Button></PermissionGate></div><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><AdminStatCard label="الفروع المستخدمة" value={`${branches.length} / ${limit}`} icon={MapPin} /><AdminStatCard label="الحد المسموح" value={limit} icon={MapPin} /><AdminStatCard label="الفروع النشطة" value={branches.filter((item) => item.status === "ACTIVE").length} icon={MapPin} /><AdminStatCard label="الفروع المتوقفة" value={branches.filter((item) => item.status === "INACTIVE").length} icon={Power} /></div>{!canAdd ? <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">لقد وصلت إلى الحد الأقصى للفروع المتاحة في اشتراكك.</div> : null}<Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[1050px] text-right text-sm"><thead className="bg-muted/50"><tr>{["اسم الفرع", "الكود", "الهاتف", "العنوان", "المنيو الحالي", "الحالة", "تاريخ الإنشاء", "الإجراءات"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody>{branches.map((branch) => <tr key={branch.id} className="border-t"><td className="px-4 py-3 font-bold">{branch.name}</td><td className="px-4 py-3">{branch.code || "—"}</td><td className="px-4 py-3">{branch.phone || "—"}</td><td className="max-w-xs truncate px-4 py-3">{branch.address || "—"}</td><td className="px-4 py-3">{branch.menuId ? menuNames.get(branch.menuId) || "—" : "غير محددة"}</td><td className="px-4 py-3"><Badge className={branch.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-700" : "bg-gray-200 text-gray-700"}>{branch.status === "ACTIVE" ? "نشط" : "متوقف"}</Badge></td><td className="px-4 py-3">{new Date(branch.createdAt).toLocaleDateString("ar-EG")}</td><td className="px-4 py-3"><div className="flex gap-1"><Button asChild variant="outline" size="icon"><Link href={`/admin/branches/${branch.id}`} aria-label="عرض"><Eye className="h-4 w-4" /></Link></Button><PermissionGate permission="branches.manage"><Button asChild variant="outline" size="icon"><Link href={`/admin/branches/${branch.id}?edit=1`} aria-label="تعديل"><Pencil className="h-4 w-4" /></Link></Button><Button variant="outline" size="sm" onClick={() => toggle(branch.id, branch.status !== "ACTIVE")}>{branch.status === "ACTIVE" ? "تعطيل" : "تفعيل"}</Button></PermissionGate></div></td></tr>)}</tbody></table>{!branches.length ? <div className="p-12 text-center"><p className="font-bold">لم تتم إضافة أي فروع حتى الآن</p><PermissionGate permission="branches.manage"><Button asChild className="mt-4"><Link href="/admin/branches/new">إضافة أول فرع</Link></Button></PermissionGate></div> : null}</CardContent></Card></section></AdminShell>;
}

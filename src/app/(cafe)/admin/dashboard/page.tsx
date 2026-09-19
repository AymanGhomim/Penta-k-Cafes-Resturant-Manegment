"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Boxes, ChefHat, ClipboardList, DollarSign, ShoppingCart, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { useBranch } from "@/providers/branch-provider";
import { dashboardApiService, type DashboardSummary } from "@/services/dashboard-api.service";
import { employeeApiService } from "@/services/employee-api.service";
import { inventoryApiService } from "@/services/inventory-api.service";
import type { InventoryItem } from "@/types/cafe-operations.types";

export default function AdminDashboardPage() {
  const access = useCurrentEmployee();
  const { branch } = useBranch();
  const [inventoryCount, setInventoryCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [remoteSummary, setRemoteSummary] = useState<DashboardSummary | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([dashboardApiService.summary(branch?.id), inventoryApiService.list<InventoryItem>("inventory"), employeeApiService.list()]).then(([summary, inventory, employees]) => { if (active) { setRemoteSummary(summary); setInventoryCount(inventory.filter((item) => item.active).length); setEmployeeCount(employees.filter((item) => item.status === "ACTIVE").length); } }).catch(() => { if (active) { setRemoteSummary(null); setInventoryCount(0); setEmployeeCount(0); } });
    return () => { active = false; };
  }, [branch?.id]);
  const sourceData = remoteSummary?.sourceData ?? [];
  const displayedOrders = remoteSummary?.recentOrders ?? [];
  const displayedSales = remoteSummary?.sales ?? 0;
  const displayedOrderCount = remoteSummary?.orderCount ?? 0;
  const displayedEmployees = remoteSummary?.activeEmployees ?? employeeCount;
  const kitchen = remoteSummary?.kitchen ?? { new: 0, preparing: 0, ready: 0 };
  const inventory = { length: inventoryCount };

  return <AdminShell><section dir="rtl" className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold text-accent">مركز التحكم</p><h1 className="mt-1 text-2xl font-black">لوحة التحكم</h1><p className="mt-1 text-sm text-muted-foreground">مرحبًا {access.employee?.name}. تظهر هنا البيانات والإجراءات المسموحة لدورك فقط.</p></div>{access.hasPermission("pos.use") ? <Button asChild><Link href="/admin/pos"><ShoppingCart className="ml-2 h-4 w-4" />فتح نقطة البيع</Link></Button> : access.hasPermission("kitchen.view") ? <Button asChild><Link href="/kitchen/orders"><ChefHat className="ml-2 h-4 w-4" />فتح شاشة المطبخ</Link></Button> : null}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{access.hasPermission("payments.view") ? <AdminStatCard label="مبيعات اليوم" value={`${displayedSales.toLocaleString("ar-EG")} ج.م`} icon={DollarSign} /> : null}{access.hasPermission("orders.view") ? <AdminStatCard label="عدد الطلبات" value={displayedOrderCount} icon={ClipboardList} /> : null}{access.hasPermission("inventory.view") ? <AdminStatCard label="عناصر المخزون" value={inventory.length} icon={Boxes} /> : null}{access.hasPermission("employees.view") ? <AdminStatCard label="الموظفون النشطون" value={displayedEmployees} icon={Users} /> : null}</div><div className="mt-4 grid gap-4 xl:grid-cols-2">{access.hasPermission("reports.view") && access.hasPermission("orders.view") ? <Card className="rounded-xl"><CardHeader><CardTitle>مصادر الطلبات</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={sourceData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="var(--tenant-primary)" radius={[6, 6, 0, 0]} barSize={48} /></BarChart></ResponsiveContainer></CardContent></Card> : null}{access.hasPermission("orders.view") ? <Card className="rounded-xl"><CardHeader><CardTitle>أحدث الطلبات</CardTitle></CardHeader><CardContent className="space-y-3">{displayedOrders.map((order) => <div key={order.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0"><span className="font-bold">{order.orderNumber}</span><span>{Number(order.total).toLocaleString("ar-EG")} ج.م</span></div>)}{!displayedOrders.length ? <p className="p-10 text-center text-sm text-muted-foreground">لا توجد طلبات في الفرع الحالي.</p> : null}</CardContent></Card> : null}{access.hasPermission("kitchen.view") ? <Card className="rounded-xl"><CardHeader><CardTitle>حالة المطبخ</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-3 text-center">{[["جديد", kitchen.new], ["قيد التحضير", kitchen.preparing], ["جاهز", kitchen.ready]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-muted/50 p-4"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div></CardContent></Card> : null}</div>{!access.hasAnyPermission(["orders.view", "payments.view", "inventory.view", "employees.view", "kitchen.view"]) ? <div className="mt-5 rounded-xl border border-dashed bg-card p-10 text-center"><BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-bold">لا توجد ودجات إضافية متاحة لهذا الدور.</p></div> : null}</section></AdminShell>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, Clock3, CreditCard, LayoutDashboard, Plus, RefreshCw, Store, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_CONFIG } from "@/config/platform.config";
import { platformDashboardApiService, type PlatformDashboardSummary } from "@/services/platform-dashboard-api.service";

const COLORS = [PLATFORM_CONFIG.colors.primary, PLATFORM_CONFIG.colors.sidebarActive, "#F59E0B", "#6B7280"];
const statusLabels: Record<string, string> = { ACTIVE: "نشط", TRIAL: "تجريبي", SUSPENDED: "موقوف", ARCHIVED: "منتهي" };
const planLabels: Record<string, string> = { BASIC: "Basic", STARTER: "Basic", GROWTH: "Pro", ENTERPRISE: "Premium" };

function Metric({ label, value, icon: Icon, tone = "text-[#374151]" }: { label: string; value: number; icon: typeof Building2; tone?: string }) {
  return <Card className="border-[#DCE7EA] shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#667085]">{label}</p><Icon className={`h-5 w-5 ${tone}`} /></div><p className="mt-3 text-3xl font-black text-[#111827]">{value}</p></CardContent></Card>;
}

export default function PlatformDashboardPage() {
  const [summary, setSummary] = useState<PlatformDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => { setLoading(true); setError(""); void platformDashboardApiService.summary().then(setSummary).catch((reason: { message?: string }) => setError(reason?.message || "تعذر تحميل بيانات لوحة المنصة")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  if (loading) return <section className="mx-auto max-w-[1500px] p-5 sm:p-10"><div className="h-8 w-72 animate-pulse rounded bg-slate-200" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div></section>;
  if (error || !summary) return <section className="mx-auto max-w-[900px] p-5 sm:p-10"><Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><AlertTriangle className="h-10 w-10 text-amber-500" /><h1 className="text-2xl font-black">تعذر تحميل لوحة المنصة</h1><p className="text-sm text-muted-foreground">{error}</p><Button onClick={load}><RefreshCw className="ml-2 h-4 w-4" />إعادة المحاولة</Button></CardContent></Card></section>;

  const { totals, subscriptions } = summary;
  const statusData = ["ACTIVE", "TRIAL", "SUSPENDED", "ARCHIVED"].map((name) => ({ name: statusLabels[name], value: summary.statusData.find((item) => item.name === name)?.value ?? 0 }));
  const planData = summary.planData.map((item) => ({ name: planLabels[item.name] || item.name, value: item.value }));

  return <section className="mx-auto max-w-[1500px] p-5 sm:p-10">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-black text-[#374151]">{PLATFORM_CONFIG.name} · مركز التحكم</p><h1 className="mt-2 text-3xl font-black">لوحة تحكم المنصة</h1><p className="mt-2 text-sm text-[#667085]">إدارة ومتابعة كل الكافيهات والاشتراكات والفروع من مكان واحد.</p></div><div className="flex gap-2"><Button variant="outline" onClick={load}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button><Button asChild className="bg-[#374151] hover:bg-[#111827]"><Link href="/platform/tenants/new"><Plus className="ml-2 h-4 w-4" />إضافة كافيه</Link></Button></div></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="إجمالي الكافيهات" value={totals.tenants} icon={Building2} /><Metric label="الكافيهات النشطة" value={totals.activeTenants} icon={Store} tone="text-emerald-600" /><Metric label="الحسابات التجريبية" value={totals.trialTenants} icon={Clock3} tone="text-amber-600" /><Metric label="الكافيهات الموقوفة" value={totals.suspendedTenants} icon={AlertTriangle} tone="text-red-500" /><Metric label="إجمالي الفروع" value={totals.branches} icon={LayoutDashboard} /><Metric label="الفروع النشطة" value={totals.activeBranches} icon={Store} tone="text-emerald-600" /><Metric label="إجمالي المستخدمين" value={totals.users} icon={Users} /><Metric label="المستخدمون النشطون" value={totals.activeUsers} icon={Users} tone="text-emerald-600" /></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-3"><Card className="border-[#DCE7EA] lg:col-span-2"><CardContent className="p-5"><h2 className="font-black">الكافيهات حسب الحالة</h2><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>{statusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-3 text-xs font-bold">{statusData.map((entry, index) => <span key={entry.name}><i className="ml-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index] }} />{entry.name}: {entry.value}</span>)}</div></CardContent></Card><Card className="border-[#DCE7EA]"><CardContent className="p-5"><h2 className="font-black">حالة الاشتراكات</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>نشطة</span><b className="text-emerald-600">{subscriptions.active}</b></div><div className="flex justify-between"><span>تجريبية</span><b className="text-amber-600">{subscriptions.trialing}</b></div><div className="flex justify-between"><span>متأخرة</span><b className="text-red-600">{subscriptions.pastDue}</b></div><div className="flex justify-between"><span>ملغاة</span><b>{subscriptions.canceled}</b></div><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="flex items-center gap-2 font-bold text-amber-800"><CreditCard className="h-4 w-4" />تنتهي خلال 30 يومًا</p><p className="mt-2 text-2xl font-black text-amber-900">{subscriptions.expiringSoon}</p></div></div></CardContent></Card></div>
    <Card className="mt-6 border-[#DCE7EA]"><CardContent className="p-5"><h2 className="font-black">توزيع الكافيهات حسب الباقة</h2><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={planData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={PLATFORM_CONFIG.colors.primary} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
    <Card className="mt-6 border-[#DCE7EA]"><CardContent className="p-5"><div className="flex items-center justify-between"><h2 className="font-black">أحدث الكافيهات</h2><Link href="/platform/tenants" className="text-sm font-bold text-[#374151]">عرض الكل</Link></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3">الكافيه</th><th className="p-3">الباقة</th><th className="p-3">الحالة</th><th className="p-3">الفروع</th><th className="p-3">المستخدمون</th><th className="p-3">إجراء</th></tr></thead><tbody>{summary.recentTenants.map((tenant) => <tr key={tenant.id} className="border-b last:border-0"><td className="p-3"><p className="font-black">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug}</p></td><td className="p-3">{planLabels[tenant.planCode] || tenant.planCode}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{statusLabels[tenant.status] || tenant.status}</span></td><td className="p-3">{tenant._count.branches}</td><td className="p-3">{tenant._count.users}</td><td className="p-3"><Button asChild variant="outline" size="sm"><Link href={`/platform/tenants/${tenant.id}`}>عرض</Link></Button></td></tr>)}</tbody></table></div></CardContent></Card>
  </section>;
}

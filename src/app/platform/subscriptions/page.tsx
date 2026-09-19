"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/formatters";
import { getPlanByCode } from "@/config/plans.config";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import type { Tenant } from "@/types/tenant.types";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { ACTIVE: "نشطة", TRIALING: "تجريبية", PAST_DUE: "متأخرة", CANCELED: "ملغاة" };

export default function PlatformSubscriptionsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const debouncedQuery = useDebouncedValue(query);
  const load = () => { setLoading(true); void platformTenantsApiService.list().then(setTenants).catch((error: { message?: string }) => toast.error(error.message || "تعذر تحميل الاشتراكات")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => tenants.filter((tenant) => { const matchesQuery = !debouncedQuery || `${tenant.name} ${tenant.slug}`.toLocaleLowerCase("ar").includes(debouncedQuery.toLocaleLowerCase("ar")); return matchesQuery && (statusFilter === "ALL" || tenant.subscriptionStatus === statusFilter); }), [debouncedQuery, statusFilter, tenants]);
  const pagination = usePagination(filtered, `${debouncedQuery}:${statusFilter}`);
  const soon = tenants.filter((tenant) => tenant.subscription?.endsAt && Math.ceil((new Date(tenant.subscription.endsAt).getTime() - Date.now()) / 86400000) <= 30).length;
  const extend = async (tenant: Tenant) => { const date = tenant.subscription?.endsAt ? new Date(tenant.subscription.endsAt) : new Date(); date.setMonth(date.getMonth() + 1); try { const updated = await platformTenantsApiService.updateSubscription(tenant.id, { status: "ACTIVE", type: "PAID", startsAt: tenant.subscription?.startsAt || new Date().toISOString(), endsAt: date.toISOString() }); setTenants((current) => current.map((item) => item.id === updated.id ? updated : item)); toast.success("تم تمديد الاشتراك شهرًا وحفظه على الخادم"); } catch (error) { toast.error((error as { message?: string }).message || "تعذر تحديث الاشتراك"); } };

  return <section className="mx-auto max-w-[1500px] p-5 sm:p-10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-black">الاشتراكات</h1><p className="mt-2 text-sm text-muted-foreground">إدارة اشتراكات الكافيهات وحالاتها وتواريخ انتهائها من قاعدة البيانات.</p></div><Button variant="outline" onClick={load}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button></div><div className="mt-7 grid gap-4 sm:grid-cols-4">{[["النشطة", tenants.filter((item) => item.subscriptionStatus === "ACTIVE") .length], ["التجريبية", tenants.filter((item) => item.subscriptionStatus === "TRIALING").length], ["تنتهي قريبًا", soon], ["المتأخرة", tenants.filter((item) => item.subscriptionStatus === "PAST_DUE").length]].map(([label, value]) => <Card key={label as string}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></CardContent></Card>)}</div><Card className="mt-6"><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]"><SearchInput value={query} onChange={setQuery} placeholder="بحث باسم الكافيه أو المعرّف المختصر" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="تصفية حسب حالة الاشتراك"><option value="ALL">كل الحالات</option><option value="ACTIVE">نشطة</option><option value="TRIALING">تجريبية</option><option value="PAST_DUE">متأخرة</option><option value="CANCELED">ملغاة</option></select></CardContent></Card>{loading ? <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-100" /> : <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-[#F3F4F6]"><tr>{["الكافيه", "الباقة", "الحالة", "تاريخ البداية", "تاريخ النهاية", "الأيام المتبقية", "الإجراءات"].map((label) => <th key={label} className="p-4 font-black">{label}</th>)}</tr></thead><tbody>{pagination.items.map((tenant) => { const endsAt = tenant.subscription?.endsAt; const days = endsAt ? Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000) : null; return <tr key={tenant.id} className="border-t"><td className="p-4"><Link className="font-black hover:underline" href={`/platform/tenants/${tenant.id}`}>{tenant.name}</Link><p className="text-xs text-muted-foreground">{tenant.slug}</p></td><td className="p-4">{getPlanByCode(tenant.plan).name}</td><td className="p-4"><StatusBadge status={statusLabels[tenant.subscriptionStatus] || tenant.subscriptionStatus} /></td><td className="p-4">{tenant.subscription?.startsAt ? formatDate(tenant.subscription.startsAt) : "—"}</td><td className="p-4">{endsAt ? formatDate(endsAt) : "بدون نهاية"}</td><td className="p-4">{days === null ? "—" : days < 0 ? <span className="font-bold text-red-600">منتهٍ</span> : `${days} يوم`}</td><td className="p-4"><Button size="sm" variant="outline" onClick={() => void extend(tenant)}><CalendarPlus className="ml-1 h-3.5 w-3.5" />تمديد شهر</Button></td></tr>; })}</tbody></table>{pagination.items.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">لا توجد اشتراكات مطابقة.</p> : null}</div>}<div className="mt-4"><Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} /></div></section>;
}

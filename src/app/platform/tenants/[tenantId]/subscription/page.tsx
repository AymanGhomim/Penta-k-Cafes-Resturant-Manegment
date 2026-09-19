"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TenantDetailHeader, TenantTabs } from "@/components/platform/tenant-detail-header";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import type { Tenant } from "@/types/tenant.types";
import { AppNotFoundState } from "@/components/feedback/app-state";
import { STATUS_LABELS } from "@/constants/status-presentation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function TenantSubscriptionPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("1");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { platformTenantsApiService.find(tenantId).then(setTenant).catch(() => setTenant(null)).finally(() => setLoading(false)); }, [tenantId]);
  if (loading) return <section className="mx-auto max-w-[1500px] p-10 text-sm text-muted-foreground">جاري تحميل الاشتراك من الخادم...</section>;
  if (!tenant) return <AppNotFoundState variant="platform" description="تعذر العثور على الكافيه في قاعدة البيانات." actionHref="/platform/tenants" actionLabel="العودة إلى الكافيهات" />;
  const updateSubscription = async (status: "ACTIVE" | "CANCELED") => { setSaving(true); try { const currentEnd = tenant.subscription?.endsAt ? new Date(tenant.subscription.endsAt) : new Date(); if (status === "ACTIVE") currentEnd.setMonth(currentEnd.getMonth() + Number(months)); const updated = await platformTenantsApiService.updateSubscription(tenant.id, { status, type: status === "ACTIVE" ? "PAID" : undefined, startsAt: tenant.subscription?.startsAt || new Date().toISOString(), endsAt: status === "ACTIVE" ? currentEnd.toISOString() : tenant.subscription?.endsAt || null }); setTenant(updated); setCancelOpen(false); toast.success(status === "ACTIVE" ? "تم تمديد الاشتراك وحفظه في قاعدة البيانات" : "تم إلغاء الاشتراك من قاعدة البيانات"); } catch (error) { toast.error((error as { message?: string }).message || "تعذر تحديث الاشتراك"); } finally { setSaving(false); } };
  return <section className="mx-auto max-w-[1500px] p-5 sm:p-10"><ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title="إلغاء اشتراك الكافيه؟" description="سيتم إيقاف الاشتراك مع الاحتفاظ بالبيانات في قاعدة البيانات." confirmLabel="إلغاء الاشتراك" onConfirm={() => void updateSubscription("CANCELED")} /><TenantDetailHeader tenant={tenant} /><TenantTabs id={tenant.id} active="subscription" /><Card className="mt-6 max-w-2xl"><CardContent className="p-6"><h2 className="text-xl font-black">إدارة الاشتراك</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-muted-foreground">الحالة</p><p className="mt-1 font-bold">{STATUS_LABELS[tenant.subscriptionStatus] || tenant.subscriptionStatus}</p></div><div><p className="text-sm text-muted-foreground">ينتهي في</p><p className="mt-1 font-bold">{tenant.subscription?.endsAt?.slice(0, 10) || "—"}</p></div></div><div className="mt-6 flex items-end gap-3"><label className="text-sm font-bold">تمديد الاشتراك<select value={months} onChange={(event) => setMonths(event.target.value)} className="mt-2 block h-10 rounded-lg border bg-white px-3"><option value="1">شهر واحد</option><option value="3">3 أشهر</option><option value="6">6 أشهر</option><option value="12">سنة</option></select></label><Button disabled={saving || tenant.subscriptionStatus === "CANCELED"} onClick={() => void updateSubscription("ACTIVE")}>{saving ? "جاري الحفظ..." : "تمديد الاشتراك"}</Button></div><div className="mt-8 border-t border-red-200 pt-6"><h3 className="font-black text-red-600">إلغاء الاشتراك</h3><p className="mt-1 text-sm text-muted-foreground">سيتم إلغاء الاشتراك وحفظ الحالة في Neon.</p><Button type="button" variant="destructive" className="mt-4" disabled={saving || tenant.subscriptionStatus === "CANCELED"} onClick={() => setCancelOpen(true)}><Ban className="ml-2 h-4 w-4" />{tenant.subscriptionStatus === "CANCELED" ? "الاشتراك ملغي" : "إلغاء الاشتراك"}</Button></div></CardContent></Card></section>;
}

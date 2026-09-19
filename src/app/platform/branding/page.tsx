"use client";
/* eslint-disable @next/next/no-img-element -- Tenant logos may be data URLs. */
import Link from "next/link";
import { Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import type { Tenant } from "@/types/tenant.types";
import { useEffect, useState } from "react";

export default function PlatformBrandingPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    platformTenantsApiService.list().then(setTenants).catch(() => {
      setError("تعذر تحميل الكافيهات من الخادم.");
      setTenants([]);
    }).finally(() => setLoading(false));
  }, []);

  return <section className="mx-auto max-w-[1500px] p-5 sm:p-10"><p className="text-sm font-black text-[#374151]">التخصيص</p><h1 className="mt-2 text-3xl font-black">قوالب الهوية</h1><p className="mt-2 text-sm text-[#667085]">اختر كافيهًا لإدارة هويته وتخصيص تجربة علامته التجارية.</p>{loading ? <p className="mt-8 text-sm text-[#667085]">جاري تحميل الكافيهات...</p> : error ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : tenants.length === 0 ? <p className="mt-8 rounded-xl border border-dashed p-8 text-center text-sm text-[#667085]">لا توجد كافيهات مسجلة حاليًا.</p> : <div className="mt-8 grid gap-4 md:grid-cols-2">{tenants.map((tenant) => <Link key={tenant.id} href={`/platform/tenants/${tenant.id}/branding`}><Card className="border-[#D1D5DB] transition hover:-translate-y-0.5 hover:border-[#374151] hover:shadow-lg"><CardContent className="flex items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><div className="h-14 w-14 rounded-xl bg-[#F3F4F6] p-2"><img src={tenant.branding.logo} alt="" className="h-full w-full object-contain" /></div><div><h2 className="font-black">{tenant.name}</h2><p className="mt-1 text-xs text-[#667085]">تعديل الألوان واللوجو وتسجيل الدخول والمنيو والفاتورة</p></div></div><Palette className="h-5 w-5 text-[#374151]" /></CardContent></Card></Link>)}</div>}</section>;
}

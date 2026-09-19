"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TenantForm } from "@/components/platform/tenant-form";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import type { Tenant } from "@/types/tenant.types";
import { AppNotFoundState } from "@/components/feedback/app-state";
export default function EditTenantPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { platformTenantsApiService.find(tenantId).then(setTenant).catch(() => setTenant(null)).finally(() => setLoading(false)); }, [tenantId]);
  if (loading) return <p className="p-10 text-sm text-muted-foreground">جاري تحميل بيانات الكافيه...</p>;
  if (!tenant)
    return <AppNotFoundState variant="platform" description="تعذر العثور على الكافيه المطلوب داخل لوحة إدارة المنصة." actionHref="/platform/tenants" actionLabel="العودة إلى الكافيهات" />;
  return <TenantForm tenant={tenant} />;
}

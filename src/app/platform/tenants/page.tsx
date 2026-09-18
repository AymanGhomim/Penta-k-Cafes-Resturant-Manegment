"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  ExternalLink,
  LayoutDashboard,
  Palette,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/formatters";
import { tenantService } from "@/services/tenant.service";
import { branchService } from "@/services/branch.service";
import type { TenantStatus } from "@/types/tenant.types";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";

const statusLabels: Record<TenantStatus, string> = {
  TRIAL: "تجريبي",
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  ARCHIVED: "منتهي",
};

function getCustomerMenuHref(tenantId: string) {
  const branch = branchService
    .getBranches(tenantId)
    .find((item) => item.status === "ACTIVE" && item.menuId);
  return branch
    ? `/menu?tenantId=${encodeURIComponent(tenantId)}&branchId=${encodeURIComponent(branch.id)}`
    : null;
}

export default function PlatformTenantsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [plan, setPlan] = useState("ALL");
  const [tenants, setTenants] = useState(() => tenantService.listTenants());
  const debouncedQuery = useDebouncedValue(query);
  useEffect(() => {
    void platformTenantsApiService.list()
      .then((remote) => {
        setTenants(remote);
        remote.forEach((tenant) => {
          if (tenantService.getTenant(tenant.id)) tenantService.updateTenant(tenant.id, tenant);
          else tenantService.createTenant(tenant);
        });
      })
      .catch(() => setTenants(tenantService.listTenants()));
  }, []);
  const filtered = useMemo(
    () =>
      tenants.filter((tenant) => {
        const text = `${tenant.name} ${tenant.slug} ${tenant.owner?.name || ""} ${tenant.contact?.phone || ""}`.toLowerCase();
        return (
          (!debouncedQuery || text.includes(debouncedQuery.toLocaleLowerCase("ar"))) &&
          (status === "ALL" || tenant.status === status) &&
          (plan === "ALL" || tenant.plan === plan)
        );
      }),
    [debouncedQuery, plan, status, tenants],
  );
  const pagination = usePagination(filtered, `${debouncedQuery}:${status}:${plan}`);
  const counts = {
    all: tenants.length,
    active: tenants.filter((tenant) => tenant.status === "ACTIVE").length,
    trial: tenants.filter((tenant) => tenant.status === "TRIAL").length,
    suspended: tenants.filter((tenant) => tenant.status === "SUSPENDED").length,
  };

  const openCafeDashboard = (tenantId: string) => {
    tenantService.selectDevelopmentTenant(tenantId);
    window.location.assign(
      `/admin/dashboard?tenantId=${encodeURIComponent(tenantId)}`,
    );
  };

  return (
    <section className="mx-auto max-w-[1500px] p-5 sm:p-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#374151]">إدارة الكافيهات</p>
          <h1 className="mt-2 text-3xl font-black">الكافيهات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة هويات المقاهي وخططها وحالات اشتراكها.
          </p>
        </div>
        <Button asChild>
          <Link href="/platform/tenants/new">
            <Building2 className="ml-2 h-4 w-4" />
            إضافة كافيه
          </Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        {[
          ["إجمالي الكافيهات", counts.all],
          ["النشطة", counts.active],
          ["التجريبية", counts.trial],
          ["الموقوفة", counts.suspended],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <SearchInput value={query} onChange={setQuery} placeholder="بحث بالاسم أو المعرّف المختصر أو المسؤول أو الهاتف" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="ALL">كل الحالات</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="ALL">كل الباقات</option>
              <option value="STARTER">Basic</option>
              <option value="GROWTH">Pro</option>
              <option value="ENTERPRISE">Premium</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[1120px] text-right text-sm">
          <thead className="bg-[#F3F4F6] text-[#374151]">
            <tr>
              {[
                "الشعار",
                "اسم الكافيه",
                "المعرّف المختصر",
                "المسؤول",
                "الباقة",
                "تاريخ الانتهاء",
                "الحالة",
                "تاريخ الإنشاء",
                "الإجراءات",
              ].map((label) => (
                <th key={label} className="p-4 font-black">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((tenant) => (
              <tr key={tenant.id} className="border-t">
                <td className="p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tenant.branding.logo}
                      alt={`شعار ${tenant.name}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </td>
                <td className="p-4 font-black">{tenant.name}</td>
                <td className="p-4 font-mono text-xs">{tenant.slug}</td>
                <td className="p-4">{tenant.owner?.name || "—"}</td>
                <td className="p-4">
                  {tenant.plan === "STARTER"
                    ? "Basic"
                    : tenant.plan === "GROWTH"
                      ? "Pro"
                      : "Premium"}
                </td>
                <td className="p-4">
                  {tenant.subscription?.endsAt?.slice(0, 10) || "—"}
                </td>
                <td className="p-4">
                  <StatusBadge status={tenant.status} />
                </td>
                <td className="p-4">{formatDate(tenant.createdAt)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {getCustomerMenuHref(tenant.id) ? (
                      <Button
                        asChild
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 px-3 text-xs"
                      >
                        <Link
                          href={getCustomerMenuHref(tenant.id)!}
                          target="_blank"
                          rel="noreferrer"
                          title={`فتح منيو العميل لـ ${tenant.name}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          منيو العميل
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openCafeDashboard(tenant.id)}
                      title={`فتح لوحة تحكم ${tenant.name}`}
                      className="h-8 gap-1.5 bg-[#111827] px-3 text-xs text-white hover:bg-black"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      فتح اللوحة
                    </Button>
                    <Action
                      href={`/platform/tenants/${tenant.id}`}
                      icon={Eye}
                      label="عرض"
                    />
                    <Action
                      href={`/platform/tenants/${tenant.id}/edit`}
                      icon={Pencil}
                      label="تعديل"
                    />
                    <Action
                      href={`/platform/tenants/${tenant.id}/branding`}
                      icon={Palette}
                      label="الهوية"
                    />
                    <Action
                      href={`/platform/tenants/${tenant.id}/features`}
                      icon={ShieldCheck}
                      label="المميزات"
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={9}><EmptyState title="لا توجد كافيهات مطابقة" description="جرّب مسح البحث أو تغيير الفلاتر الحالية." icon="search" /></td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination {...pagination.state} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </div>
    </section>
  );
}

function Action({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="h-8 w-8"
      title={label}
    >
      <Link href={href} aria-label={label}>
        <Icon className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}

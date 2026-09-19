"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_TENANT } from "@/config/tenants.config";
import type { Tenant } from "@/types/tenant.types";
import { tenantService } from "@/services/tenant.service";
import { useCartStore } from "@/store/cart.store";
import { useOrdersStore } from "@/store/orders.store";
import { useSettingsStore } from "@/store/settings.store";
import { useCustomerRoute } from "@/providers/customer-route-provider";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import { cafeTenantApiService } from "@/services/cafe-tenant-api.service";

type TenantContextValue = {
  tenant: Tenant;
  isDemoTenantResolver: boolean;
  error?: string;
};
const TenantContext = createContext<TenantContextValue | null>(null);

async function resolveTenant(): Promise<{ tenant: Tenant; error?: string }> {
  if (typeof window === "undefined") return { tenant: DEFAULT_TENANT };
  const requestedTenantId = new URLSearchParams(window.location.search).get(
    "tenantId",
  );
  const requestedTenant = requestedTenantId
    ? await platformTenantsApiService.find(requestedTenantId).catch(() => undefined)
    : undefined;
  if (requestedTenant) {
    tenantService.setRemoteActiveTenant(requestedTenant);
    return { tenant: requestedTenant };
  }
  if (requestedTenantId)
    return {
      tenant: DEFAULT_TENANT,
      error: "الكافيه المطلوب غير موجود. ارجع إلى المنصة واختر كافيهًا صالحًا.",
    };
  const remoteTenant = await cafeTenantApiService.get().catch(() => undefined);
  if (remoteTenant) { tenantService.setRemoteActiveTenant(remoteTenant); return { tenant: remoteTenant }; }
  const hostname = window.location.hostname.toLowerCase();
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  const configuredSlug =
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || DEFAULT_TENANT.slug;
  const subdomain =
    rootDomain && hostname.endsWith(`.${rootDomain}`)
      ? hostname.slice(0, -(rootDomain.length + 1))
      : undefined;
  const requestedSlug =
    subdomain && subdomain !== "www" && subdomain !== "platform"
      ? subdomain
      : configuredSlug;
  void requestedSlug;
  return {
    tenant: DEFAULT_TENANT,
    error: "تعذر تحديد هوية الكافيه من الخادم. راجع إعدادات النطاق والـ API.",
  };
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const customerRoute = useCustomerRoute();
  const [tenant, setTenant] = useState(DEFAULT_TENANT);
  const [error, setError] = useState<string>();
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    const refresh = async (resetOperationalState: boolean) => {
      const next = customerRoute.context
        ? { tenant: customerRoute.context.tenant }
        : await resolveTenant();
      setTenant(next.tenant);
      setError(next.error);
      setResolved(true);
      if (resetOperationalState) useCartStore.getState().clearCart();
      if (!next.error && resetOperationalState) {
        useOrdersStore.getState().loadForTenant(next.tenant.id);
        useSettingsStore.getState().loadForTenant(next.tenant.id);
      }
    };
    const handleTenantChanged = () => void refresh(true);
    const handleBrandingChanged = () => void refresh(false);
    void refresh(true);
    window.addEventListener("tenant:changed", handleTenantChanged);
    window.addEventListener("tenant:branding-changed", handleBrandingChanged);
    return () => {
      window.removeEventListener("tenant:changed", handleTenantChanged);
      window.removeEventListener("tenant:branding-changed", handleBrandingChanged);
    };
  }, [customerRoute.context]);

  if (!resolved) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900"
      >
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p className="mt-4 text-sm font-bold">جاري تحديد مساحة الكافيه...</p>
        </div>
      </main>
    );
  }

  return (
    <TenantContext.Provider
      value={{ tenant, isDemoTenantResolver: true, error }}
    >
      {error ? (
        <main
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900"
        >
          <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-black">تعذر فتح مساحة العمل</h1>
            <p className="mt-3 text-sm text-slate-600">{error}</p>
          </div>
        </main>
      ) : (
        children
      )}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
}

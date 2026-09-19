import { DEFAULT_TENANT } from "@/config/tenants.config";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Tenant } from "@/types/tenant.types";

type BackendTenant = {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  status: Tenant["status"];
  adminClientMode: Tenant["adminClientMode"];
  currency: string;
  timezone: string;
  locale: string;
  maxBranches: number;
  planCode: string;
  createdAt: string;
  subscription?: { type: "TRIAL" | "PAID"; status: Tenant["subscriptionStatus"]; startsAt: string; endsAt?: string | null } | null;
  _count?: { branches: number; users: number };
};

type Envelope<T> = { success: boolean; data: T };

export function toFrontendTenant(item: BackendTenant): Tenant {
  return {
    ...DEFAULT_TENANT,
    id: item.id,
    name: item.name,
    slug: item.slug,
    legalName: item.legalName ?? undefined,
    status: item.status,
    adminClientMode: item.adminClientMode,
    plan: item.planCode,
    subscriptionStatus: item.subscription?.status ?? "TRIALING",
    createdAt: item.createdAt,
    settings: {
      ...DEFAULT_TENANT.settings,
      currency: item.currency,
      currencySymbol: item.currency === "EGP" ? "ج.م" : item.currency,
      timezone: item.timezone,
      locale: item.locale.startsWith("ar") ? "ar" : "en",
    },
    subscription: item.subscription
      ? { type: item.subscription.type, startsAt: item.subscription.startsAt, endsAt: item.subscription.endsAt ?? "" }
      : undefined,
    maxBranchesOverride: item.maxBranches,
  };
}

export const platformTenantsApiService = {
  async list() {
    const response = await httpClient.get<Envelope<BackendTenant[]>>(API_ENDPOINTS.platform.tenants);
    return response.data.data.map(toFrontendTenant);
  },
  async find(id: string) {
    const response = await httpClient.get<Envelope<BackendTenant>>(`${API_ENDPOINTS.platform.tenants}/${id}`);
    return toFrontendTenant(response.data.data);
  },
  async create(input: Pick<Tenant, "name" | "slug" | "status" | "adminClientMode" | "plan">) {
    const response = await httpClient.post<Envelope<BackendTenant>>(API_ENDPOINTS.platform.tenants, {
      name: input.name,
      slug: input.slug,
      status: input.status,
      adminClientMode: input.adminClientMode,
      planCode: input.plan,
    });
    return toFrontendTenant(response.data.data);
  },
  async update(id: string, input: Partial<Pick<Tenant, "name" | "slug" | "status" | "adminClientMode" | "plan">>) {
    const response = await httpClient.patch<Envelope<BackendTenant>>(`${API_ENDPOINTS.platform.tenants}/${id}`, {
      ...input,
      planCode: input.plan,
    });
    return toFrontendTenant(response.data.data);
  },
  async updateStatus(id: string, status: Tenant["status"]) {
    return this.update(id, { status });
  },
  async updateSubscription(id: string, input: { status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED"; type?: "TRIAL" | "PAID"; startsAt?: string; endsAt?: string | null }) {
    const response = await httpClient.patch<Envelope<BackendTenant>>(`${API_ENDPOINTS.platform.tenants}/${id}/subscription`, input);
    return toFrontendTenant(response.data.data);
  },
};

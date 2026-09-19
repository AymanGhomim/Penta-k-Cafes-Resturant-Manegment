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
  contact?: Tenant["contact"] | null;
  branding?: Tenant["branding"] | null;
  settings?: Tenant["settings"] | null;
  features?: Tenant["features"] | null;
  featureOverrides?: Tenant["featureOverrides"] | null;
  users?: { name: string; email: string; username?: string | null; phone?: string | null }[];
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
    subscription: item.subscription
      ? { type: item.subscription.type, startsAt: item.subscription.startsAt, endsAt: item.subscription.endsAt ?? "" }
      : undefined,
    maxBranchesOverride: item.maxBranches,
    contact: item.contact ?? undefined,
    branding: item.branding ? { ...DEFAULT_TENANT.branding, ...item.branding } : DEFAULT_TENANT.branding,
    settings: item.settings ? { ...DEFAULT_TENANT.settings, ...item.settings } : { ...DEFAULT_TENANT.settings, currency: item.currency, currencySymbol: item.currency === "EGP" ? "ج.م" : item.currency, timezone: item.timezone, locale: item.locale.startsWith("ar") ? "ar" : "en" },
    features: item.features ? { ...DEFAULT_TENANT.features, ...item.features } : DEFAULT_TENANT.features,
    featureOverrides: item.featureOverrides ?? undefined,
    owner: item.users?.[0] ? { name: item.users[0].name, email: item.users[0].email, username: item.users[0].username ?? undefined, phone: item.users[0].phone ?? undefined } : undefined,
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
  async create(input: Tenant & { ownerPassword?: string; ownerUsername?: string }) {
    const response = await httpClient.post<Envelope<BackendTenant>>(API_ENDPOINTS.platform.tenants, {
      name: input.name,
      slug: input.slug,
      status: input.status,
      adminClientMode: input.adminClientMode,
      planCode: input.plan,
      contact: input.contact,
      branding: input.branding,
      settings: input.settings,
      features: input.features,
      featureOverrides: input.featureOverrides,
      owner: input.owner ? { ...input.owner, username: input.ownerUsername || input.owner.username, password: input.ownerPassword } : undefined,
      subscription: input.subscription,
    });
    return toFrontendTenant(response.data.data);
  },
  async update(id: string, input: Partial<Tenant> & { ownerPassword?: string; ownerUsername?: string }) {
    const response = await httpClient.patch<Envelope<BackendTenant>>(`${API_ENDPOINTS.platform.tenants}/${id}`, {
      ...input,
      planCode: input.plan,
      legalName: input.legalName,
      contact: input.contact,
      branding: input.branding,
      settings: input.settings,
      features: input.features,
      featureOverrides: input.featureOverrides,
      owner: input.owner ? { ...input.owner, username: input.ownerUsername || input.owner.username, password: input.ownerPassword } : undefined,
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

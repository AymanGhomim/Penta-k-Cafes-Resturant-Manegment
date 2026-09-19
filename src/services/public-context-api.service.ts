import { httpClient } from "@/services/http-client";
import type { Branch } from "@/types/branch.types";
import type { Table } from "@/types/table.types";
import type { Tenant } from "@/types/tenant.types";

type PublicResponse = { tenant: Record<string, unknown>; branch: Branch; tables: Table[] };
const defaultBranding = { logo: "", primary: "#111827", secondary: "#374151", accent: "#2563eb", background: "#ffffff", surface: "#ffffff", sidebar: "#111827", sidebarText: "#ffffff", textPrimary: "#111827", textSecondary: "#6b7280", border: "#e5e7eb", radius: "0.75rem" };
export const publicContextApiService = {
  async resolve(tenantId: string, branchId?: string) {
    const response = await httpClient.get<PublicResponse>("/public/menu", { params: { tenantId, branchId } });
    const raw = response.data.tenant;
    const tenant: Tenant = {
      id: String(raw.id), slug: String(raw.slug), name: String(raw.name), status: raw.status as Tenant["status"], plan: String(raw.planCode ?? "BASIC"), subscriptionStatus: "ACTIVE", adminClientMode: "BOTH", branding: { ...defaultBranding, ...(raw.branding as Record<string, unknown> ?? {}) } as Tenant["branding"], settings: { currency: "EGP", currencySymbol: "ج.م", timezone: "Africa/Cairo", locale: "ar", taxRate: 0, ...(raw.settings as Record<string, unknown> ?? {}) } as Tenant["settings"], features: { onlineMenu: true, qrOrdering: true, delivery: true, inventory: true, reports: true, ...(raw.features as Record<string, boolean> ?? {}) }, createdAt: String(raw.createdAt ?? new Date(0).toISOString()), contact: raw.contact as Tenant["contact"],
    };
    return { ...response.data, tenant };
  },
};

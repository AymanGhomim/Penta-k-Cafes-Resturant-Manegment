import { mockTenantRepository } from "@/repositories/mock-tenant.repository";
import { tenantStorage } from "@/repositories/tenant-storage";
import type { Tenant } from "@/types/tenant.types";

// Frontend-only local demo bootstrap. Normal navigation must use a selected,
// existing tenant; invalid saved IDs are rejected instead of leaking demo data.
const DEVELOPMENT_BOOTSTRAP_TENANT_ID = "tenant-golden-drip";
let remoteActiveTenantId: string | undefined;

function requireActiveTenantId() {
  if (remoteActiveTenantId) return remoteActiveTenantId;
  const id =
    mockTenantRepository.getSelected() || DEVELOPMENT_BOOTSTRAP_TENANT_ID;
  if (!mockTenantRepository.get(id))
    throw new Error("تعذر تحديد الكافيه الحالي. اختر كافيهًا صالحًا أولًا.");
  return id;
}

export const tenantService = {
  setRemoteActiveTenant: (tenant: Tenant) => { remoteActiveTenantId = tenant.id; },
  listTenants: () => mockTenantRepository.list(),
  getTenant: (id: string) => mockTenantRepository.get(id),
  createTenant: (tenant: Tenant) => mockTenantRepository.create(tenant),
  updateTenant: (id: string, patch: Partial<Tenant>) => {
    const tenant = mockTenantRepository.update(id, patch);
    if (
      typeof window !== "undefined" &&
      mockTenantRepository.getSelected() === id
    )
      window.dispatchEvent(new Event("tenant:branding-changed"));
    return tenant;
  },
  cancelSubscription: (id: string) => {
    const tenant = mockTenantRepository.update(id, {
      status: "SUSPENDED",
      subscriptionStatus: "CANCELED",
    });
    if (!tenant) throw new Error("الكافيه غير موجود.");
    return tenant;
  },
  deleteTenant: (id: string) => {
    const tenant = mockTenantRepository.remove(id);
    tenantStorage.removeTenant(id);
    return tenant;
  },
  selectDevelopmentTenant: (id: string) => mockTenantRepository.setSelected(id),
  getSelectedDevelopmentTenant: () => mockTenantRepository.getSelected(),
  getActiveTenantId: requireActiveTenantId,
  requireActiveTenantId,
};

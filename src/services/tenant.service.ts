import type { Tenant } from "@/types/tenant.types";

let remoteActiveTenant: Tenant | undefined;

function requireActiveTenantId() {
  if (remoteActiveTenant) return remoteActiveTenant.id;
  throw new Error("تعذر تحديد الكافيه الحالي من الخادم.");
}

export const tenantService = {
  setRemoteActiveTenant: (tenant: Tenant) => { remoteActiveTenant = tenant; },
  listTenants: () => [],
  getTenant: (id: string) => remoteActiveTenant?.id === id ? remoteActiveTenant : undefined,
  getActiveTenantId: requireActiveTenantId,
  requireActiveTenantId,
};

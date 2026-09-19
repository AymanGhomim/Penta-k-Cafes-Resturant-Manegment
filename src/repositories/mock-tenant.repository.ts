import {
  DEMO_TENANTS,
  GOLDEN_DRIP_CONTACT,
} from "@/config/tenants.config";
import type { Tenant } from "@/types/tenant.types";

const STORAGE_KEY = "platform:tenants:v1";
const SELECTED_KEY = "platform:selected-tenant:v1";
const GOLDEN_CONTACT_MIGRATION_KEY = "migration:golden-contact:kafr-v1";
const ADMIN_CLIENT_MODE_MIGRATION_KEY = "migration:admin-client-mode:v1";
let memoryTenants = process.env.NODE_ENV === "production" ? [] : [...DEMO_TENANTS];

function read() {
  if (typeof window === "undefined") return memoryTenants;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "null",
    );
    if (Array.isArray(value)) {
      const restoreGoldenContact =
        window.localStorage.getItem(GOLDEN_CONTACT_MIGRATION_KEY) !== "done";
      const migrateAdminClientMode =
        window.localStorage.getItem(ADMIN_CLIENT_MODE_MIGRATION_KEY) !== "done";
      memoryTenants = value.map((storedTenant: Tenant) => {
        // Development-only persisted mock migration. Real API responses must
        // always provide adminClientMode and are never silently defaulted.
        const tenant = migrateAdminClientMode && !storedTenant.adminClientMode
          ? { ...storedTenant, adminClientMode: "WEB" as const }
          : storedTenant;
        return tenant.id === "tenant-golden-drip"
          ? {
              ...tenant,
              adminClientMode: migrateAdminClientMode ? "BOTH" : tenant.adminClientMode,
              maxBranchesOverride: 1,
              contact: restoreGoldenContact
                ? GOLDEN_DRIP_CONTACT
                : tenant.contact,
            }
          : tenant;
      });
      if (restoreGoldenContact || migrateAdminClientMode) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryTenants));
        if (restoreGoldenContact)
          window.localStorage.setItem(GOLDEN_CONTACT_MIGRATION_KEY, "done");
        if (migrateAdminClientMode)
          window.localStorage.setItem(ADMIN_CLIENT_MODE_MIGRATION_KEY, "done");
      }
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return memoryTenants;
}
function write(tenants: Tenant[]) {
  memoryTenants = tenants;
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
}

export const mockTenantRepository = {
  list: () => [...read()],
  get: (id: string) => read().find((tenant) => tenant.id === id),
  create: (tenant: Tenant) => {
    write([...read(), tenant]);
    return tenant;
  },
  update: (id: string, patch: Partial<Tenant>) => {
    const updated = read().map((tenant) =>
      tenant.id === id ? { ...tenant, ...patch } : tenant,
    );
    write(updated);
    return updated.find((tenant) => tenant.id === id);
  },
  remove: (id: string) => {
    const tenant = read().find((item) => item.id === id);
    if (!tenant) throw new Error("الكافيه غير موجود.");
    write(read().filter((item) => item.id !== id));
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(SELECTED_KEY) === id
    ) {
      window.localStorage.removeItem(SELECTED_KEY);
      window.dispatchEvent(new Event("tenant:changed"));
    }
    return tenant;
  },
  setSelected: (id: string) => {
    if (!read().some((tenant) => tenant.id === id))
      throw new Error("لا يمكن اختيار كافيه غير موجود.");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_KEY, id);
      window.dispatchEvent(new Event("tenant:changed"));
    }
  },
  getSelected: () =>
    typeof window === "undefined"
      ? undefined
      : window.localStorage.getItem(SELECTED_KEY) || undefined,
};

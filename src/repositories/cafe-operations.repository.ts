import { tenantStorage } from "@/repositories/tenant-storage";
import { tenantService } from "@/services/tenant.service";
import type {
  OperationRecord,
  OperationResource,
} from "@/types/cafe-operations.types";
import { branchService } from "@/services/branch.service";
import { cloneDevelopmentFixture, developmentOperations } from "@shared/development-data";

const resources: OperationResource[] = [
  "inventory",
  "stockMovements",
  "stockCounts",
  "waste",
  "recipes",
  "suppliers",
  "purchases",
  "expenses",
  "customers",
  "loyalty",
  "coupons",
  "deliveryZones",
  "payments",
  "refunds",
  "cashRegister",
  "shifts",
  "notifications",
  "waiterRequests",
  "modifierGroups",
  "loyaltySettings",
  "auditLog",
];
const activeTenant = () => tenantService.requireActiveTenantId();
const tenantLevel = new Set<OperationResource>([
  "recipes",
  "suppliers",
  "customers",
  "loyalty",
  "coupons",
  "modifierGroups",
  "loyaltySettings",
  "auditLog",
]);
const seed = (
  resource: OperationResource,
  tenantId: string,
): OperationRecord[] => {
  if (process.env.NODE_ENV === "production") return [];
  return cloneDevelopmentFixture(developmentOperations[tenantId]?.[resource] ?? []);
};
export const cafeOperationsRepository = {
  resources,
  get<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    tenantId = activeTenant(),
  ): T[] {
    if (process.env.NODE_ENV === "production") return [];
    const branchId = branchService.getActiveBranchId(tenantId);
    if (tenantLevel.has(resource))
      return tenantStorage.get<T[]>(
        tenantId,
        resource,
        seed(resource, tenantId) as T[],
      );
    if (!branchId) return [];
    const initial = seed(resource, tenantId).map((record) => ({
      ...record,
      branchId,
      quantity:
        resource === "inventory" && branchId === "branch-golden-cairo"
          ? 7
          : record.quantity,
    })) as unknown as T[];
    return tenantStorage.getForBranch<T[]>(
      tenantId,
      branchId,
      resource,
      initial,
    );
  },
  set<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    records: T[],
    tenantId = activeTenant(),
  ) {
    const branchId = branchService.getActiveBranchId(tenantId);
    if (tenantLevel.has(resource))
      return tenantStorage.set(tenantId, resource, records);
    if (!branchId) return records;
    return tenantStorage.setForBranch(
      tenantId,
      branchId,
      resource,
      records.map((record) => ({ ...record, tenantId, branchId })),
    );
  },
  getForBranch<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    branchId: string,
    tenantId = activeTenant(),
  ): T[] {
    if (tenantLevel.has(resource)) return this.get<T>(resource, tenantId);
    return tenantStorage.getForBranch<T[]>(tenantId, branchId, resource, []);
  },
  setForBranch<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    branchId: string,
    records: T[],
    tenantId = activeTenant(),
  ) {
    if (tenantLevel.has(resource)) return this.set(resource, records, tenantId);
    return tenantStorage.setForBranch(
      tenantId,
      branchId,
      resource,
      records.map((record) => ({ ...record, tenantId, branchId })),
    );
  },
};

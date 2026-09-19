import { tenantService } from "@/services/tenant.service";
import type {
  OperationRecord,
  OperationResource,
} from "@/types/cafe-operations.types";

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
export const cafeOperationsRepository = {
  resources,
  get<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    tenantId = activeTenant(),
  ): T[] {
    void resource;
    void tenantId;
    return [];
  },
  set<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    records: T[],
    tenantId = activeTenant(),
  ) {
    void resource;
    void tenantId;
    return records;
  },
  getForBranch<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    branchId: string,
    tenantId = activeTenant(),
  ): T[] {
    void branchId;
    return this.get<T>(resource, tenantId);
  },
  setForBranch<T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    branchId: string,
    records: T[],
    tenantId = activeTenant(),
  ) {
    void branchId;
    return this.set(resource, records, tenantId);
  },
};

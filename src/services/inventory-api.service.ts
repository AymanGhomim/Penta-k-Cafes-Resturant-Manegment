import { httpClient } from "@/services/http-client";
import { branchService } from "@/services/branch.service";
import type { OperationRecord } from "@/types/cafe-operations.types";

type Kind = "inventory" | "purchases" | "recipes" | "waste" | "stockMovements" | "stockCounts" | "deliveryZones" | "shifts" | "suppliers" | "roles" | "notifications" | "waiterRequests";
type Envelope<T> = { success: boolean; data: T };
type RecordValue = OperationRecord;
const branchId = () => branchService.getActiveBranchId() ?? undefined;
const endpoint = (kind: Kind) => `/cafe/inventory/${kind}`;
const unwrap = <T>(data: T) => data;

export const inventoryApiService = {
  async list<T extends RecordValue>(kind: Kind) {
    const response = await httpClient.get<Envelope<T[]>>(endpoint(kind), { params: { branchId: branchId() } });
    return response.data.data.map(unwrap);
  },
  async create<T extends RecordValue>(kind: Kind, data: Omit<T, "id" | "tenantId">) {
    const response = await httpClient.post<Envelope<T>>("/cafe/inventory", { kind, branchId: branchId(), data });
    return response.data.data;
  },
  async update<T extends RecordValue>(id: string, data: Partial<T>) {
    const response = await httpClient.patch<Envelope<T>>(`/cafe/inventory/${id}`, { data, branchId: branchId() });
    return response.data.data;
  },
  async remove(id: string) { await httpClient.delete(`/cafe/inventory/${id}`); },
};

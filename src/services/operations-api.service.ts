import { httpClient } from "@/services/http-client";
import { branchService } from "@/services/branch.service";

type Envelope<T> = { success: boolean; data: T };
export type OperationKind =
  | "suppliers"
  | "roles"
  | "stockCounts"
  | "notifications"
  | "waiterRequests"
  | "auditLog";

const branchId = () => branchService.getActiveBranchId() ?? undefined;

export const operationsApiService = {
  async list<T>(kind: OperationKind) {
    const response = await httpClient.get<Envelope<T[]>>(`/cafe/inventory/${kind}`, {
      params: { branchId: branchId() },
    });
    return response.data.data;
  },
  async create<T>(kind: OperationKind, data: Omit<T, "id" | "tenantId">) {
    const response = await httpClient.post<Envelope<T>>("/cafe/inventory", {
      kind,
      branchId: branchId(),
      data,
    });
    return response.data.data;
  },
  async update<T>(id: string, data: Partial<T>) {
    const response = await httpClient.patch<Envelope<T>>(`/cafe/inventory/${id}`, {
      data,
      branchId: branchId(),
    });
    return response.data.data;
  },
  async remove(id: string) {
    await httpClient.delete(`/cafe/inventory/${id}`);
  },
};

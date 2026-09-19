import { httpClient } from "@/services/http-client";
import { branchService } from "@/services/branch.service";
import type { ModifierGroup } from "@/types/cafe-operations.types";

type Envelope<T> = { success: boolean; data: T };
const endpoint = "/cafe/inventory/modifierGroups";
const branchId = () => branchService.getActiveBranchId() ?? undefined;
export const modifierApiService = {
  async list() { const response = await httpClient.get<Envelope<ModifierGroup[]>>(endpoint, { params: { branchId: branchId() } }); return response.data.data; },
  async create(data: Omit<ModifierGroup, "id" | "tenantId">) { const response = await httpClient.post<Envelope<ModifierGroup>>("/cafe/inventory", { kind: "modifierGroups", branchId: branchId(), data }); return response.data.data; },
  async update(id: string, data: Partial<ModifierGroup>) { const response = await httpClient.patch<Envelope<ModifierGroup>>(`/cafe/inventory/${id}`, { data, branchId: branchId() }); return response.data.data; },
  async remove(id: string) { await httpClient.delete(`/cafe/inventory/${id}`); },
};

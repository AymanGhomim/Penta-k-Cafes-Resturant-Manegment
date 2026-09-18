import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Branch } from "@/types/branch.types";

type BackendBranch = Omit<Branch, "status" | "menuId" | "tenantId"> & { tenantId: string; isActive: boolean };
const mapBranch = (branch: BackendBranch): Branch => ({
  ...branch,
  status: branch.isActive ? "ACTIVE" : "INACTIVE",
});

export const branchApiService = {
  async list() {
    const response = await httpClient.get<BackendBranch[]>(API_ENDPOINTS.cafe.branches);
    return response.data.map(mapBranch);
  },
  async updateStatus(id: string, isActive: boolean) {
    const response = await httpClient.patch<BackendBranch>(`${API_ENDPOINTS.cafe.branches}/${id}/status`, { isActive });
    return mapBranch(response.data);
  },
  async create(input: Pick<Branch, "name"> & Partial<Pick<Branch, "code" | "phone" | "email" | "address">> & { status?: Branch["status"] }) {
    const response = await httpClient.post<BackendBranch>(API_ENDPOINTS.cafe.branches, {
      ...input,
      isActive: input.status !== "INACTIVE",
    });
    return mapBranch(response.data);
  },
  async find(id: string) {
    const response = await httpClient.get<BackendBranch>(`${API_ENDPOINTS.cafe.branches}/${id}`);
    return mapBranch(response.data);
  },
  async update(id: string, input: Partial<Pick<Branch, "name" | "code" | "phone" | "email" | "address" | "status">>) {
    const response = await httpClient.patch<BackendBranch>(`${API_ENDPOINTS.cafe.branches}/${id}`, {
      ...input,
      isActive: input.status === undefined ? undefined : input.status !== "INACTIVE",
    });
    return mapBranch(response.data);
  },
};

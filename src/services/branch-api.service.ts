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
};

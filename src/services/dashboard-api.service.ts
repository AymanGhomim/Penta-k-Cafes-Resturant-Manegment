import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";

export type DashboardSummary = {
  sales: number;
  orderCount: number;
  activeEmployees: number;
  sourceData: { name: string; value: number }[];
  kitchen: { new: number; preparing: number; ready: number };
  recentOrders: { id: string; orderNumber: string; total: number; status: string; source: string; createdAt: string }[];
};

export const dashboardApiService = {
  async summary(branchId?: string) {
    const response = await httpClient.get<DashboardSummary>(`${API_ENDPOINTS.cafe.dashboard}/summary`, { params: { branchId } });
    return response.data;
  },
};

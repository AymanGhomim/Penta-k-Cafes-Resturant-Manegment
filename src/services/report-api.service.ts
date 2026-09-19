import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { ReportFilters } from "@/services/report.service";

export type RemoteReport = {
  sales: { grossSales: number; discounts: number; refunds: number; netSales: number; taxes: number; serviceCharges: number; deliveryFees: number; orderCount: number; averageOrder: number; orders: any[] };
  products: { productId: string; name: string; quantity: number; revenue: number }[];
  breakdown: { byType: { value: string; count: number }[]; bySource: { value: string; count: number }[] };
  payments: { method: string; amount: number; count: number; percentage: number }[];
  profit: { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number };
  inventory: { value: number; lowStock: number; outOfStock: number; purchases: number; waste: number; saleConsumption: number; adjustments: number };
  employees: { id: string; name: string }[];
};

export const reportApiService = {
  async summary(filters: ReportFilters) {
    const params = {
      branchId: filters.branchIds?.length === 1 ? filters.branchIds[0] : undefined,
      from: filters.from,
      to: filters.to,
      orderType: filters.orderType,
      source: filters.orderSource,
      paymentMethod: filters.paymentMethod,
    };
    const response = await httpClient.get<RemoteReport>(`${API_ENDPOINTS.cafe.reports}/summary`, { params });
    return response.data;
  },
};

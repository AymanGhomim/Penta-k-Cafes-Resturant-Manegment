import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Customer, LoyaltySettings, LoyaltyTransaction } from "@/types/cafe-operations.types";

type Envelope<T> = { success: boolean; data: T };
export type RemoteCustomer = Customer & { analytics: { orderCount: number; totalSpend: number; averageOrder: number; lastVisit?: string; orders: Array<{ id: string; orderNumber: string; total: number; createdAt: string }> }; loyaltyBalance: number };

export const customerLoyaltyApiService = {
  async listCustomers() { const response = await httpClient.get<Envelope<RemoteCustomer[]>>(API_ENDPOINTS.cafe.customers); return response.data.data; },
  async findCustomer(id: string) { const response = await httpClient.get<Envelope<RemoteCustomer>>(`${API_ENDPOINTS.cafe.customers}/${id}`); return response.data.data; },
  async createCustomer(input: Pick<Customer, "name" | "phone" | "email" | "address">) { const response = await httpClient.post<Envelope<RemoteCustomer>>(API_ENDPOINTS.cafe.customers, input); return response.data.data; },
  async updateAddresses(id: string, addresses: Customer["addresses"]) { const response = await httpClient.patch<Envelope<RemoteCustomer>>(`${API_ENDPOINTS.cafe.customers}/${id}/addresses`, { addresses }); return response.data.data; },
  async getLoyaltySettings() { const response = await httpClient.get<Envelope<LoyaltySettings>>(API_ENDPOINTS.cafe.loyaltySettings); return response.data.data; },
  async updateLoyaltySettings(input: Partial<Omit<LoyaltySettings, "id" | "tenantId" | "updatedAt">>) { const response = await httpClient.patch<Envelope<LoyaltySettings>>(API_ENDPOINTS.cafe.loyaltySettings, input); return response.data.data; },
  async listLoyaltyTransactions() { const response = await httpClient.get<Envelope<LoyaltyTransaction[]>>(API_ENDPOINTS.cafe.loyaltyTransactions); return response.data.data; },
};

import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Order, OrderStatus } from "@/types/order.types";

type Envelope<T> = { success: boolean; data: T };
type BackendOrder = Omit<Order, "subtotal" | "discount" | "tax" | "serviceCharge" | "deliveryFee" | "total" | "items"> & { subtotal: string | number; discount: string | number; tax: string | number; serviceCharge: string | number; deliveryFee: string | number; total: string | number; items: Array<Omit<Order["items"][number], "unitPrice" | "totalPrice"> & { unitPrice: string | number; totalPrice: string | number }> };
const number = (value: string | number | null | undefined) => Number(value ?? 0);
const mapOrder = (order: BackendOrder): Order => ({ ...order, tableNumber: order.tableNumber ?? 0, subtotal: number(order.subtotal), discount: number(order.discount), tax: number(order.tax), serviceCharge: number(order.serviceCharge), deliveryFee: number(order.deliveryFee), total: number(order.total), items: order.items.map((item) => ({ ...item, unitPrice: number(item.unitPrice), totalPrice: number(item.totalPrice) })) });

export const orderApiService = {
  async list(branchId?: string, status?: OrderStatus) {
    const response = await httpClient.get<Envelope<BackendOrder[]>>(API_ENDPOINTS.orders.root, { params: { branchId, status } });
    return response.data.data.map(mapOrder);
  },
  async updateStatus(id: string, status: OrderStatus) {
    const response = await httpClient.patch<Envelope<BackendOrder>>(`${API_ENDPOINTS.orders.root}/${id}/status`, { status });
    return mapOrder(response.data.data);
  },
  async create(input: Record<string, unknown>) {
    const response = await httpClient.post<Envelope<BackendOrder>>(API_ENDPOINTS.orders.root, input);
    return mapOrder(response.data.data);
  },
};

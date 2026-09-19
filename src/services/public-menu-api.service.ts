import { httpClient } from "@/services/http-client";
import type { Category } from "@/types/category.types";
import type { Offer } from "@/types/offer.types";
import type { Product } from "@/types/product.types";
import type { Branch } from "@/types/branch.types";
import type { Table } from "@/types/table.types";
import type { Order } from "@/types/order.types";

type PublicMenu = { tenant: { id: string; name: string; slug: string; branding?: unknown; settings?: unknown }; branch: Branch; categories: Category[]; products: Array<Product & { defaultPrice?: number; price: number }>; offers: Offer[]; tables: Table[] };
export const publicMenuApiService = {
  async load(tenantId: string, branchId: string) {
    const response = await httpClient.get<PublicMenu>("/public/menu", { params: { tenantId, branchId } });
    return response.data;
  },
  async createOrder(input: Record<string, unknown>) {
    return httpClient.post("/public/orders", input);
  },
  async getOrder(tenantId: string, orderId: string) {
    const response = await httpClient.get<BackendOrder>(`/public/orders/${orderId}`, { params: { tenantId } });
    return mapOrder(response.data);
  },
};

type BackendOrder = Omit<Order, "subtotal" | "discount" | "tax" | "serviceCharge" | "deliveryFee" | "total" | "items"> & {
  subtotal: string | number; discount: string | number; tax: string | number; serviceCharge: string | number; deliveryFee: string | number; total: string | number;
  items: Array<Omit<Order["items"][number], "unitPrice" | "totalPrice"> & { unitPrice: string | number; totalPrice: string | number }>;
};
const number = (value: string | number | null | undefined) => Number(value ?? 0);
const mapOrder = (order: BackendOrder): Order => ({ ...order, tableNumber: order.tableNumber ?? 0, subtotal: number(order.subtotal), discount: number(order.discount), tax: number(order.tax), serviceCharge: number(order.serviceCharge), deliveryFee: number(order.deliveryFee), total: number(order.total), items: order.items.map((item) => ({ ...item, unitPrice: number(item.unitPrice), totalPrice: number(item.totalPrice) })) });

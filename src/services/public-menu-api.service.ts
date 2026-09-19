import { httpClient } from "@/services/http-client";
import type { Category } from "@/types/category.types";
import type { Offer } from "@/types/offer.types";
import type { Product } from "@/types/product.types";
import type { Branch } from "@/types/branch.types";
import type { Table } from "@/types/table.types";

type PublicMenu = { tenant: { id: string; name: string; slug: string; branding?: unknown; settings?: unknown }; branch: Branch; categories: Category[]; products: Array<Product & { defaultPrice?: number; price: number }>; offers: Offer[]; tables: Table[] };
export const publicMenuApiService = {
  async load(tenantId: string, branchId: string) {
    const response = await httpClient.get<PublicMenu>("/public/menu", { params: { tenantId, branchId } });
    return response.data;
  },
  async createOrder(input: Record<string, unknown>) {
    return httpClient.post("/public/orders", input);
  },
};

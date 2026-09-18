import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Category } from "@/types/category.types";
import type { Product } from "@/types/product.types";

type ApiEnvelope<T> = { success: boolean; data: T };

export const catalogApiService = {
  async listCategories() {
    const response = await httpClient.get<ApiEnvelope<Category[]>>(API_ENDPOINTS.cafe.categories);
    return response.data.data;
  },
  async createCategory(input: Pick<Category, "name"> & Partial<Pick<Category, "image" | "sortOrder" | "isActive">>) {
    const response = await httpClient.post<ApiEnvelope<Category>>(API_ENDPOINTS.cafe.categories, input);
    return response.data.data;
  },
  async updateCategory(id: string, input: Partial<Pick<Category, "name" | "image" | "sortOrder" | "isActive">>) {
    const response = await httpClient.patch<ApiEnvelope<Category>>(`${API_ENDPOINTS.cafe.categories}/${id}`, input);
    return response.data.data;
  },
  async deleteCategory(id: string) {
    await httpClient.delete(`${API_ENDPOINTS.cafe.categories}/${id}`);
  },
  async listProducts() {
    const response = await httpClient.get<ApiEnvelope<Array<Product & { defaultPrice: number }>>>(API_ENDPOINTS.cafe.products);
    return response.data.data.map(({ defaultPrice, ...product }) => ({ ...product, price: defaultPrice }));
  },
  async createProduct(input: Pick<Product, "name" | "categoryId" | "isAvailable"> & Partial<Pick<Product, "description" | "image">> & { price: number }) {
    const response = await httpClient.post<ApiEnvelope<Product & { defaultPrice: number }>>(API_ENDPOINTS.cafe.products, {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      image: input.image,
      isAvailable: input.isAvailable,
      defaultPrice: input.price,
    });
    const { defaultPrice, ...product } = response.data.data;
    return { ...product, price: defaultPrice };
  },
  async updateProduct(id: string, input: Partial<Pick<Product, "name" | "categoryId" | "isAvailable">> & Partial<Pick<Product, "description" | "image">> & { price?: number }) {
    const response = await httpClient.patch<ApiEnvelope<Product & { defaultPrice: number }>>(`${API_ENDPOINTS.cafe.products}/${id}`, {
      ...input,
      defaultPrice: input.price,
    });
    const { defaultPrice, ...product } = response.data.data;
    return { ...product, price: defaultPrice };
  },
  async deleteProduct(id: string) {
    await httpClient.delete(`${API_ENDPOINTS.cafe.products}/${id}`);
  },
};

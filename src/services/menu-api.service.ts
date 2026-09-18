import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Menu, MenuItem } from "@/types/branch.types";

type Envelope<T> = { success: boolean; data: T };

export const menuApiService = {
  async list() {
    const response = await httpClient.get<Envelope<Menu[]>>(API_ENDPOINTS.cafe.menus);
    return response.data.data;
  },
  async create(input: Pick<Menu, "name"> & Partial<Pick<Menu, "description" | "status">>) {
    const response = await httpClient.post<Envelope<Menu>>(API_ENDPOINTS.cafe.menus, input);
    return response.data.data;
  },
  async update(id: string, input: Partial<Pick<Menu, "name" | "description" | "status">>) {
    const response = await httpClient.patch<Envelope<Menu>>(`${API_ENDPOINTS.cafe.menus}/${id}`, input);
    return response.data.data;
  },
  async remove(id: string) {
    await httpClient.delete(`${API_ENDPOINTS.cafe.menus}/${id}`);
  },
  async listItems(menuId: string) {
    const response = await httpClient.get<Envelope<MenuItem[]>>(`${API_ENDPOINTS.cafe.menus}/${menuId}/items`);
    return response.data.data;
  },
  async createItem(menuId: string, input: Omit<MenuItem, "id" | "tenantId" | "menuId">) {
    const response = await httpClient.post<Envelope<MenuItem>>(`${API_ENDPOINTS.cafe.menus}/${menuId}/items`, input);
    return response.data.data;
  },
  async updateItem(menuId: string, itemId: string, input: Partial<Omit<MenuItem, "id" | "tenantId" | "menuId">>) {
    const response = await httpClient.patch<Envelope<MenuItem>>(`${API_ENDPOINTS.cafe.menus}/${menuId}/items/${itemId}`, input);
    return response.data.data;
  },
  async removeItem(menuId: string, itemId: string) {
    await httpClient.delete(`${API_ENDPOINTS.cafe.menus}/${menuId}/items/${itemId}`);
  },
};

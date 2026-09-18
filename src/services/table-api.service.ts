import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Table } from "@/types/table.types";

export const tableApiService = {
  async list(branchId: string) { const response = await httpClient.get<Table[]>(API_ENDPOINTS.tables.root, { params: { branchId } }); return response.data; },
  async create(branchId: string, number: number) { const response = await httpClient.post<Table>(API_ENDPOINTS.tables.root, { number }, { params: { branchId } }); return response.data; },
  async update(id: string, input: Partial<Pick<Table, "number" | "isActive">>) { const response = await httpClient.patch<Table>(`${API_ENDPOINTS.tables.root}/${id}`, input); return response.data; },
  async remove(id: string) { await httpClient.delete(`${API_ENDPOINTS.tables.root}/${id}`); },
};

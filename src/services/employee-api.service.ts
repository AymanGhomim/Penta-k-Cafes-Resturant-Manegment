import { httpClient } from "@/services/http-client";
import type { CafeEmployee, EmployeeStatus } from "@/types/access-control.types";

type BackendEmployee = { id: string; tenantId: string; name: string; email: string; status: EmployeeStatus; role: string; createdAt: string; updatedAt: string };
type Envelope<T> = { success: boolean; data: T };
export type BackendRole = { code: string; name: string; permissions: string[] };

export const employeeApiService = {
  async list() { const response = await httpClient.get<Envelope<BackendEmployee[]>>("/cafe/employees"); return response.data.data; },
  async roles() { const response = await httpClient.get<Envelope<BackendRole[]>>("/cafe/roles"); return response.data.data; },
  async permissions() { const response = await httpClient.get<Envelope<string[]>>("/cafe/permissions"); return response.data.data; },
  async create(input: { name: string; email: string; password: string; role?: string }) { const response = await httpClient.post<Envelope<BackendEmployee>>("/cafe/employees", input); return response.data.data; },
  async update(id: string, input: { name?: string; email?: string; password?: string; role?: string }) { const response = await httpClient.patch<Envelope<BackendEmployee>>(`/cafe/employees/${id}`, input); return response.data.data; },
  async updateStatus(id: string, status: EmployeeStatus) { const response = await httpClient.patch<Envelope<BackendEmployee>>(`/cafe/employees/${id}/status`, { status }); return response.data.data; },
  toFrontend(item: BackendEmployee, roleId: string): CafeEmployee { return { id: item.id, tenantId: item.tenantId, name: item.name, phone: "", email: item.email, roleId, branchAccess: "ALL", branchIds: [], status: item.status, joinDate: item.createdAt, createdAt: item.createdAt, updatedAt: item.updatedAt }; },
};

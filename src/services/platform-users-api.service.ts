import { API_ENDPOINTS } from '@/services/api-endpoints';
import { httpClient } from '@/services/http-client';

export type PlatformUser = { id: string; name: string; email: string; role: string; status: 'ACTIVE' | 'SUSPENDED'; createdAt: string; updatedAt: string };
export type PlatformRole = { id: string; code: string; name: string; description: string; permissions: string[]; active: boolean; createdAt: string; updatedAt: string };
type Envelope<T> = { success: boolean; data: T };

export const platformUsersApiService = {
  async listUsers() { return (await httpClient.get<Envelope<PlatformUser[]>>(API_ENDPOINTS.platform.users)).data.data; },
  async createUser(input: { name: string; email: string; password: string; role: string }) { return (await httpClient.post<Envelope<PlatformUser>>(API_ENDPOINTS.platform.users, input)).data.data; },
  async updateStatus(id: string, status: PlatformUser['status']) { return (await httpClient.patch<Envelope<PlatformUser>>(`${API_ENDPOINTS.platform.users}/${id}/status`, { status })).data.data; },
  async remove(id: string) { await httpClient.delete(`${API_ENDPOINTS.platform.users}/${id}`); },
  async listRoles() { return (await httpClient.get<Envelope<PlatformRole[]>>(API_ENDPOINTS.platform.roles)).data.data; },
  async createRole(input: { code: string; name: string; description: string; permissions: string[] }) { return (await httpClient.post<Envelope<PlatformRole>>(API_ENDPOINTS.platform.roles, input)).data.data; },
  async updateRole(id: string, input: Partial<PlatformRole>) { return (await httpClient.patch<Envelope<PlatformRole>>(`${API_ENDPOINTS.platform.roles}/${id}`, input)).data.data; },
};

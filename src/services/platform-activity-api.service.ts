import { API_ENDPOINTS } from '@/services/api-endpoints';
import { httpClient } from '@/services/http-client';

export type PlatformActivityLog = { id: string; actorId?: string | null; actorEmail?: string | null; tenantId?: string | null; tenantName?: string | null; action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown> | null; createdAt: string };
export type ActivityLogFilters = { dateFrom?: string; dateTo?: string; action?: string; tenantId?: string; actorEmail?: string };

export const platformActivityApiService = {
  async list(filters: ActivityLogFilters = {}) {
    const response = await httpClient.get<{ success: boolean; data: PlatformActivityLog[] }>(API_ENDPOINTS.platform.activityLogs, { params: filters });
    return response.data.data;
  },
};

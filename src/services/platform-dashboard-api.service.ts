import { API_ENDPOINTS } from '@/services/api-endpoints';
import { httpClient } from '@/services/http-client';

export type PlatformDashboardSummary = {
  totals: { tenants: number; activeTenants: number; trialTenants: number; suspendedTenants: number; archivedTenants: number; branches: number; activeBranches: number; users: number; activeUsers: number };
  subscriptions: { trialing: number; active: number; pastDue: number; canceled: number; expiringSoon: number };
  statusData: { name: string; value: number }[];
  planData: { name: string; value: number }[];
  recentTenants: { id: string; name: string; slug: string; status: string; planCode: string; createdAt: string; subscription: { status: string; endsAt: string | null } | null; _count: { branches: number; users: number } }[];
};

export const platformDashboardApiService = {
  async summary() {
    const response = await httpClient.get<{ success: boolean; data: PlatformDashboardSummary }>(`${API_ENDPOINTS.platform.dashboard}/summary`);
    return response.data.data;
  },
};

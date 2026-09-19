import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import { toFrontendTenant, type BackendTenant } from "@/services/platform-tenants-api.service";

type Envelope<T> = { success: boolean; data: T };

export const cafeTenantApiService = {
  async get() {
    const response = await httpClient.get<Envelope<BackendTenant>>(API_ENDPOINTS.cafe.tenant);
    return toFrontendTenant(response.data.data);
  },
  async update(input: { name?: string; legalName?: string; contact?: Record<string, unknown>; settings?: Record<string, unknown> }) {
    const response = await httpClient.patch<Envelope<BackendTenant>>(API_ENDPOINTS.cafe.tenant, input);
    return toFrontendTenant(response.data.data);
  },
};

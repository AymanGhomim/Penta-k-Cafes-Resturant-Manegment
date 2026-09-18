import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";

export type CurrentAuthUser = { id: string; name: string; email: string; role: string; tenantId?: string | null };
type Envelope<T> = { success: boolean; data: T };

export const authSessionService = {
  async refresh() {
    const response = await httpClient.post<Envelope<{ accessToken: string; expiresIn: string; user: CurrentAuthUser }>>(API_ENDPOINTS.auth.refresh);
    if (typeof window !== "undefined") localStorage.setItem("accessToken", response.data.data.accessToken);
    return response.data.data;
  },
  async me() {
    const response = await httpClient.get<Envelope<CurrentAuthUser>>(API_ENDPOINTS.auth.me);
    return response.data.data;
  },
  clear() {
    if (typeof window !== "undefined") localStorage.removeItem("accessToken");
  },
};

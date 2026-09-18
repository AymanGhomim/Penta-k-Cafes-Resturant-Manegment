import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";

export type PlatformAuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string | null;
};

export type PlatformLoginResponse = {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: string;
    user: PlatformAuthUser;
  };
};

export const platformAuthService = {
  async login(email: string, password: string) {
    const response = await httpClient.post<PlatformLoginResponse>(API_ENDPOINTS.auth.platformLogin, {
      email,
      password,
    });
    return response.data.data;
  },
};

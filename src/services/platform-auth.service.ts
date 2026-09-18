import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import { authSessionService } from "@/services/auth-session.service";

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
    const result = response.data.data;
    if (typeof window !== "undefined") localStorage.setItem("accessToken", result.accessToken);
    const user = await authSessionService.me();
    return { ...result, user };
  },
};

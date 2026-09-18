import { httpClient } from "@/services/http-client";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import type { CafeLoginErrorCode, CafeLoginRequest } from "@/types/auth.types";
import type { CafeEmployee } from "@/types/access-control.types";
import type { Tenant } from "@/types/tenant.types";

export type CafeLoginResult =
  | { ok: true; employee: CafeEmployee; tenant: Tenant }
  | { ok: false; code: CafeLoginErrorCode };

/** Development adapter mirroring POST /api/v1/auth/cafe/login. */
export const cafeAuthService = {
  async login(request: CafeLoginRequest): Promise<CafeLoginResult> {
    try {
      const response = await httpClient.post<{
        success: boolean;
        data: { accessToken: string; user: { id: string; name: string; email: string; role: string; tenantId: string }; tenant: unknown };
      }>(API_ENDPOINTS.auth.cafeLogin, request);
      const result = response.data.data;
      if (typeof window !== "undefined") localStorage.setItem("accessToken", result.accessToken);
      return { ok: true, employee: { id: result.user.id, name: result.user.name, status: "ACTIVE", roleId: result.user.role } as CafeEmployee, tenant: result.tenant as Tenant };
    } catch (error) {
      const code = (error as { code?: string }).code;
      return { ok: false, code: code === "TENANT_NOT_FOUND" ? "TENANT_NOT_FOUND" : code === "CLIENT_TYPE_NOT_ALLOWED" ? "CLIENT_TYPE_NOT_ALLOWED" : code === "EMPLOYEE_SUSPENDED" ? "EMPLOYEE_SUSPENDED" : "INVALID_CREDENTIALS" };
    }
  },
};

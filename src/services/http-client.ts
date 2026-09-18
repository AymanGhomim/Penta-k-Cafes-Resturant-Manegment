import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { APP_CONFIG } from "@/config/app.config";
import { API_ENDPOINTS } from "@/services/api-endpoints";

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

function normalizeError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as Record<string, unknown>;
    return {
      message: (data?.message as string) || "حدث خطأ في الخادم",
      code: (data?.code as string) || "UNKNOWN_ERROR",
      status: error.response.status,
    };
  }
  if (error.request) {
    return {
      message: "لا يوجد اتصال بالخادم",
      code: "NETWORK_ERROR",
    };
  }
  return {
    message: error.message || "حدث خطأ غير متوقع",
    code: "UNKNOWN_ERROR",
  };
}

class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: APP_CONFIG.apiBaseUrl,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
        const url = config?.url || "";
        if (error.response?.status === 401 && config && !config._retry && !url.includes(API_ENDPOINTS.auth.refresh)) {
          config._retry = true;
          try {
            const refreshed = await this.client.post<{ data: { accessToken: string } }>(API_ENDPOINTS.auth.refresh);
            if (typeof window !== "undefined") localStorage.setItem("accessToken", refreshed.data.data.accessToken);
            if (config.headers) config.headers.Authorization = `Bearer ${refreshed.data.data.accessToken}`;
            return this.client.request(config);
          } catch {
            if (typeof window !== "undefined") localStorage.removeItem("accessToken");
          }
        }
        const normalized = normalizeError(error);
        return Promise.reject(normalized);
      }
    );
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

export const httpClient = new HttpClient();

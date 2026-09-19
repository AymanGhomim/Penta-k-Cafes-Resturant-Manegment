import { API_ENDPOINTS } from "@/services/api-endpoints";
import { httpClient } from "@/services/http-client";
import type { Offer } from "@/types/offer.types";
import type { Coupon } from "@/types/cafe-operations.types";

type Envelope<T> = { success: boolean; data: T };
type RemoteCoupon = { id: string; tenantId: string; code: string; type: Coupon["type"]; value: number | string; minimumOrder?: number | string; maximumDiscount?: number | string; startDate?: string; endDate?: string; usageLimit?: number; perCustomerLimit?: number; usageCount?: number; usages?: Coupon["usages"]; active: boolean };

function normalizeCoupon(coupon: RemoteCoupon): Coupon {
  return { id: coupon.id, tenantId: coupon.tenantId, code: coupon.code, type: coupon.type, value: Number(coupon.value), minimumOrder: Number(coupon.minimumOrder ?? 0), maximumDiscount: coupon.maximumDiscount == null ? undefined : Number(coupon.maximumDiscount), startDate: coupon.startDate, endDate: coupon.endDate, usageLimit: coupon.usageLimit, perCustomerLimit: coupon.perCustomerLimit, usageCount: coupon.usageCount, usages: coupon.usages, active: coupon.active };
}

export const promotionsApiService = {
  async listOffers() {
    const response = await httpClient.get<Envelope<Offer[]>>(API_ENDPOINTS.cafe.offers);
    return response.data.data;
  },
  async createOffer(input: Omit<Offer, "id" | "tenantId">) {
    const response = await httpClient.post<Envelope<Offer>>(API_ENDPOINTS.cafe.offers, input);
    return response.data.data;
  },
  async updateOffer(id: string, input: Partial<Omit<Offer, "id" | "tenantId">>) {
    const response = await httpClient.patch<Envelope<Offer>>(`${API_ENDPOINTS.cafe.offers}/${id}`, input);
    return response.data.data;
  },
  async toggleOffer(id: string, isActive: boolean) {
    const response = await httpClient.patch<Envelope<Offer>>(`${API_ENDPOINTS.cafe.offers}/${id}/status`, { isActive });
    return response.data.data;
  },
  async deleteOffer(id: string) { await httpClient.delete(`${API_ENDPOINTS.cafe.offers}/${id}`); },
  async listCoupons() {
    const response = await httpClient.get<Envelope<RemoteCoupon[]>>(API_ENDPOINTS.cafe.coupons);
    return response.data.data.map(normalizeCoupon);
  },
  async createCoupon(input: Omit<Coupon, "id" | "tenantId" | "branchId" | "usageCount" | "usages">) {
    const response = await httpClient.post<Envelope<RemoteCoupon>>(API_ENDPOINTS.cafe.coupons, input);
    return normalizeCoupon(response.data.data);
  },
  async updateCoupon(id: string, input: Partial<Omit<Coupon, "id" | "tenantId" | "branchId" | "usageCount" | "usages">>) {
    const response = await httpClient.patch<Envelope<RemoteCoupon>>(`${API_ENDPOINTS.cafe.coupons}/${id}`, input);
    return normalizeCoupon(response.data.data);
  },
  async deleteCoupon(id: string) { await httpClient.delete(`${API_ENDPOINTS.cafe.coupons}/${id}`); },
};

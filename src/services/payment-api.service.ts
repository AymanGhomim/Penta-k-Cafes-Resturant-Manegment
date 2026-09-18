import { httpClient } from "@/services/http-client";
import type { PaymentRecord } from "@/types/cafe-operations.types";

type BackendPayment = { id: string; tenantId: string; orderId: string; transactionNumber: string; amount: string | number; method: PaymentRecord["method"]; status: PaymentRecord["status"]; transactionReference?: string | null; refundAmount?: string | number; createdAt: string };
type Envelope<T> = { success: boolean; data: T };
const mapPayment = (item: BackendPayment): PaymentRecord => ({ id: item.id, tenantId: item.tenantId, orderId: item.orderId, transactionNumber: item.transactionNumber, amount: Number(item.amount), method: item.method, status: item.status, transactionReference: item.transactionReference ?? undefined, createdAt: item.createdAt });

export const paymentApiService = {
  async list() { const response = await httpClient.get<Envelope<BackendPayment[]>>("/cafe/payments"); return response.data.data.map(mapPayment); },
  async refund(id: string, amount: number, reason: string) { const response = await httpClient.patch<Envelope<BackendPayment>>(`/cafe/payments/${id}/refund`, { amount, reason }); return mapPayment(response.data.data); },
};

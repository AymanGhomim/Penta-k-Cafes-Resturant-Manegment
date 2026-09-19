import { operationsApiService } from "@/services/operations-api.service";
import type { NotificationRecord, WaiterRequest } from "@/types/cafe-operations.types";

const changed = () => typeof window !== "undefined" && window.dispatchEvent(new Event("operations:changed"));

export const engagementService = {
  async getWaiterRequests() { return operationsApiService.list<WaiterRequest>("waiterRequests"); },
  async createWaiterRequest(value: Omit<WaiterRequest, "id" | "tenantId" | "branchId" | "status" | "createdAt">) {
    const request = await operationsApiService.create<WaiterRequest>("waiterRequests", { ...value, status: "NEW", createdAt: new Date().toISOString() });
    await operationsApiService.create<NotificationRecord>("notifications", { type: value.type === "BILL" ? "BILL_REQUEST" : "WAITER_REQUEST", title: value.type === "BILL" ? "طلب حساب جديد" : "طلب خدمة جديد", message: `طاولة ${value.tableNumber ?? value.tableId}`, read: false, relatedEntityType: "waiterRequest", relatedEntityId: request.id, createdAt: request.createdAt });
    changed();
    return request;
  },
  async updateWaiterRequest(requestId: string, status: "ACCEPTED" | "COMPLETED") {
    const request = (await this.getWaiterRequests()).find((item) => item.id === requestId);
    if (!request) throw new Error("طلب الويتر غير موجود في الفرع الحالي.");
    if (status === "ACCEPTED" && request.status !== "NEW") throw new Error("تم استلام هذا الطلب من قبل.");
    if (status === "COMPLETED" && request.status !== "ACCEPTED") throw new Error("يجب استلام الطلب قبل إكماله.");
    const now = new Date().toISOString();
    const updated = await operationsApiService.update<WaiterRequest>(requestId, status === "ACCEPTED" ? { status, acceptedAt: now } : { status, completedAt: now });
    changed();
    return updated;
  },
  async getNotifications() { return operationsApiService.list<NotificationRecord>("notifications"); },
  async markNotificationRead(notificationId: string) { await operationsApiService.update<NotificationRecord>(notificationId, { read: true }); changed(); },
  async markAllNotificationsRead() { const records = await this.getNotifications(); await Promise.all(records.filter((item) => !item.read).map((item) => operationsApiService.update<NotificationRecord>(item.id, { read: true }))); changed(); },
};

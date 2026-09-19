import { cafeTenantApiService } from "@/services/cafe-tenant-api.service";
import type { CustomerMenuSettings } from "@/types/customer-menu-settings.types";

export const defaultCustomerMenuSettings = (tenantId = ""): CustomerMenuSettings => ({
  tenantId, onlineOrderingEnabled: true, menuOpen: true, autoAcceptOrders: false,
  qrEnabled: true, multipleTableOrders: false, waiterRequestsEnabled: true,
  billRequestsEnabled: true, payAtCashierEnabled: true, electronicDineInPaymentEnabled: false,
  takeawayEnabled: true, asapPickupEnabled: true, scheduledPickupEnabled: false,
  preparationMinutes: 20, deliveryEnabled: true, minimumDeliveryOrder: 0,
  estimatedDeliveryMinutes: 45, cashEnabled: true, cardEnabled: false,
  walletEnabled: false, onlinePaymentEnabled: false, updatedAt: new Date(0).toISOString(),
});

export const customerMenuSettingsApiService = {
  async get() {
    const tenant = await cafeTenantApiService.get();
    const stored = (tenant.settings as unknown as { menuSettings?: Partial<CustomerMenuSettings> })?.menuSettings;
    return { ...defaultCustomerMenuSettings(tenant.id), ...stored, tenantId: tenant.id };
  },
  async save(settings: CustomerMenuSettings) {
    if (!Number.isFinite(settings.preparationMinutes) || settings.preparationMinutes <= 0) throw new Error("مدة التحضير يجب أن تكون أكبر من صفر.");
    if (!Number.isFinite(settings.minimumDeliveryOrder) || settings.minimumDeliveryOrder < 0) throw new Error("الحد الأدنى للطلب غير صالح.");
    if (!Number.isFinite(settings.estimatedDeliveryMinutes) || settings.estimatedDeliveryMinutes <= 0) throw new Error("وقت التوصيل المتوقع غير صالح.");
    const saved = { ...settings, updatedAt: new Date().toISOString() };
    await cafeTenantApiService.update({ settings: { menuSettings: saved } });
    return saved;
  },
};

import { cafeTenantApiService } from "@/services/cafe-tenant-api.service";
import { customerMenuSettingsService } from "@/services/customer-menu-settings.service";
import type { CustomerMenuSettings } from "@/types/customer-menu-settings.types";

export const customerMenuSettingsApiService = {
  async get() {
    const fallback = customerMenuSettingsService.get();
    const tenant = await cafeTenantApiService.get();
    const stored = (tenant.settings as unknown as { menuSettings?: Partial<CustomerMenuSettings> })?.menuSettings;
    return { ...fallback, ...stored, tenantId: tenant.id };
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

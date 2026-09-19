import { inventoryApiService } from "@/services/inventory-api.service";
import type { DeliveryZone } from "@/types/cafe-operations.types";

let remoteZones: DeliveryZone[] = [];
export const deliveryZoneApiService = {
  async list() { remoteZones = await inventoryApiService.list<DeliveryZone>("deliveryZones"); return remoteZones; },
  getCached() { return remoteZones; },
  setCached(zones: DeliveryZone[]) { remoteZones = zones; },
  create(data: Omit<DeliveryZone, "id" | "tenantId">) { return inventoryApiService.create<DeliveryZone>("deliveryZones", data); },
  update(id: string, data: Partial<DeliveryZone>) { return inventoryApiService.update<DeliveryZone>(id, data); },
  remove(id: string) { return inventoryApiService.remove(id); },
};

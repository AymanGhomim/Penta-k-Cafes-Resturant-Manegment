import {
  developmentCategories,
  developmentOffers,
  developmentOrders,
  developmentProducts,
  developmentTables,
  forTenant,
} from "@shared/development-data";
import { tenantStorage } from "@/repositories/tenant-storage";
import type { Category } from "@/types/category.types";
import type { Offer } from "@/types/offer.types";
import type { Order } from "@/types/order.types";
import type { Product } from "@/types/product.types";
import type { Table } from "@/types/table.types";

export type CafeSettings = { workingHours: string; taxRate: number; serviceCharge: number; onlineOrdering: boolean; takeaway: boolean; delivery: boolean; paymentMethods: string[]; receiptHeader: string; receiptFooter: string; kitchenSound: boolean };
export type TenantDataset = { products: Product[]; categories: Category[]; orders: Order[]; tables: Table[]; offers: Offer[]; settings: CafeSettings };
const defaults: CafeSettings = { workingHours: "09:00 - 23:00", taxRate: 0, serviceCharge: 0, onlineOrdering: true, takeaway: true, delivery: true, paymentMethods: ["CASH", "CARD"], receiptHeader: "", receiptFooter: "شكرًا لزيارتكم", kitchenSound: true };
function seed(tenantId: string): TenantDataset {
  if (process.env.NODE_ENV === "production") return { products: [], categories: [], orders: [], tables: [], offers: [], settings: { ...defaults } };
  return {
    products: forTenant(developmentProducts, tenantId),
    categories: forTenant(developmentCategories, tenantId),
    orders: forTenant(developmentOrders, tenantId),
    tables: forTenant(developmentTables, tenantId),
    offers: forTenant(developmentOffers, tenantId),
    settings: { ...defaults },
  };
}

function resource<T>(tenantId: string, name: keyof TenantDataset, initial: T): T {
  if (process.env.NODE_ENV === "production") return initial;
  const stored = tenantStorage.get(tenantId, name, initial);
  if (
    tenantId === "tenant-golden-drip" &&
    name === "products" &&
    Array.isArray(stored) &&
    !tenantStorage.get<boolean>(
      tenantId,
      "migration:golden-products-v2",
      false,
    )
  ) {
    const productIds = new Set(
      (stored as Array<{ id?: string }>).map((item) => item.id).filter(Boolean),
    );
    const menuItems = tenantStorage.get<Array<{ productId: string }>>(
      tenantId,
      "menu-items",
      [],
    );
    const hasExpectedProduct = menuItems.some((item) =>
      productIds.has(item.productId),
    );
    const containsForeignSeed = [...productIds].some((id) =>
      id?.startsWith("moon-prod-"),
    );
    tenantStorage.set(tenantId, "migration:golden-products-v2", true);
    if (
      productIds.size === 0 ||
      (menuItems.length > 0 && !hasExpectedProduct) ||
      containsForeignSeed
    ) {
      tenantStorage.set(tenantId, name, initial);
      return initial;
    }
  }
  return stored;
}
export const tenantDataRepository = {
  getProducts: (tenantId: string) => resource(tenantId, "products", seed(tenantId).products),
  saveProducts: (tenantId: string, value: Product[]) => tenantStorage.set(tenantId, "products", value),
  getCategories: (tenantId: string) => resource(tenantId, "categories", seed(tenantId).categories),
  saveCategories: (tenantId: string, value: Category[]) => tenantStorage.set(tenantId, "categories", value),
  getOrders: (tenantId: string) => resource(tenantId, "orders", seed(tenantId).orders),
  saveOrders: (tenantId: string, value: Order[]) => tenantStorage.set(tenantId, "orders", value),
  getTables: (tenantId: string) => resource(tenantId, "tables", seed(tenantId).tables),
  saveTables: (tenantId: string, value: Table[]) => tenantStorage.set(tenantId, "tables", value),
  getOffers: (tenantId: string) => resource(tenantId, "offers", seed(tenantId).offers),
  saveOffers: (tenantId: string, value: Offer[]) => tenantStorage.set(tenantId, "offers", value),
  getSettings: (tenantId: string) => resource(tenantId, "settings", defaults),
  saveSettings: (tenantId: string, value: CafeSettings) => tenantStorage.set(tenantId, "settings", value),
};

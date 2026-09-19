import type { Category } from "@/types/category.types";
import type { Offer } from "@/types/offer.types";
import type { Order } from "@/types/order.types";
import type { Product } from "@/types/product.types";
import type { Table } from "@/types/table.types";

export type CafeSettings = { workingHours: string; taxRate: number; serviceCharge: number; onlineOrdering: boolean; takeaway: boolean; delivery: boolean; paymentMethods: string[]; receiptHeader: string; receiptFooter: string; kitchenSound: boolean };
export type TenantDataset = { products: Product[]; categories: Category[]; orders: Order[]; tables: Table[]; offers: Offer[]; settings: CafeSettings };
const defaults: CafeSettings = { workingHours: "09:00 - 23:00", taxRate: 0, serviceCharge: 0, onlineOrdering: true, takeaway: true, delivery: true, paymentMethods: ["CASH", "CARD"], receiptHeader: "", receiptFooter: "شكرًا لزيارتكم", kitchenSound: true };
function resource<T>(tenantId: string, name: keyof TenantDataset, initial: T): T {
  void tenantId;
  void name;
  return initial;
}
export const tenantDataRepository = {
  getProducts: (tenantId: string) => resource(tenantId, "products", [] as Product[]),
  saveProducts: (_tenantId: string, value: Product[]) => value,
  getCategories: (tenantId: string) => resource(tenantId, "categories", [] as Category[]),
  saveCategories: (_tenantId: string, value: Category[]) => value,
  getOrders: (tenantId: string) => resource(tenantId, "orders", [] as Order[]),
  saveOrders: (_tenantId: string, value: Order[]) => value,
  getTables: (tenantId: string) => resource(tenantId, "tables", [] as Table[]),
  saveTables: (_tenantId: string, value: Table[]) => value,
  getOffers: (tenantId: string) => resource(tenantId, "offers", [] as Offer[]),
  saveOffers: (_tenantId: string, value: Offer[]) => value,
  getSettings: (tenantId: string) => resource(tenantId, "settings", { ...defaults }),
  saveSettings: (_tenantId: string, value: CafeSettings) => value,
};

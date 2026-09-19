import { cafeOperationsRepository } from "@/repositories/cafe-operations.repository";
import { branchService } from "@/services/branch.service";
import { tenantService } from "@/services/tenant.service";
import { roundMoney } from "@/lib/money";
import { calculateRecipeCost } from "@/lib/recipe-cost";
import type {
  AuditEntry,
  InventoryItem,
  OperationRecord,
  OperationResource,
  Purchase,
  Recipe,
  StockCount,
  StockMovement,
  WasteRecord,
} from "@/types/cafe-operations.types";
import { useAuthStore } from "@/store/auth.store";
import { operationsApiService } from "@/services/operations-api.service";

const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const notifyChanged = () => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("operations:changed"));
};
export const cafeOperationsService = {
  get: <T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
  ) => cafeOperationsRepository.get<T>(resource),
  save: <T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    records: T[],
  ) => cafeOperationsRepository.set(resource, records),
  create: <T extends OperationRecord = OperationRecord>(
    resource: OperationResource,
    value: Omit<T, "id" | "tenantId">,
  ) => {
    const tenantId = tenantService.requireActiveTenantId();
    const branchId = branchService.getActiveBranchId(tenantId) ?? undefined;
    const record = {
      ...value,
      id: id(resource),
      tenantId,
      branchId: value.branchId ?? branchId,
    } as T;
    cafeOperationsRepository.set(resource, [
      ...cafeOperationsRepository.get<T>(resource),
      record,
    ]);
    return record;
  },
  remove: (resource: OperationResource, recordId: string) =>
    cafeOperationsRepository.set(
      resource,
      cafeOperationsRepository
        .get(resource)
        .filter((record) => record.id !== recordId),
    ),
  audit: (entry: Omit<AuditEntry, "id" | "tenantId" | "createdAt">) => {
    const value = { ...entry, userId: entry.userId ?? useAuthStore.getState().user?.employeeId ?? useAuthStore.getState().user?.id, createdAt: new Date().toISOString() };
    void operationsApiService.create<AuditEntry>("auditLog", value).catch(() => undefined);
    return cafeOperationsService.create<AuditEntry>("auditLog", value);
  },
  recordWaste(value: Omit<WasteRecord, "id" | "tenantId" | "createdAt">) {
    const inventory = cafeOperationsRepository.get<InventoryItem>("inventory");
    const item = inventory.find((entry) => entry.id === value.inventoryItemId);
    if (!item) throw new Error("عنصر المخزون غير موجود.");
    const quantity = Number(value.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new Error("كمية الهالك يجب أن تكون أكبر من صفر.");
    if (quantity > item.quantity)
      throw new Error("كمية الهالك أكبر من الرصيد المتاح.");
    const before = item.quantity;
    const after = roundMoney(before - quantity);
    cafeOperationsRepository.set(
      "inventory",
      inventory.map((entry) =>
        entry.id === item.id
          ? { ...entry, quantity: after, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    const movement = cafeOperationsService.create<StockMovement>(
      "stockMovements",
      {
        inventoryItemId: item.id,
        type: "WASTE",
        quantity,
        quantityBefore: before,
        quantityAfter: after,
        notes: value.notes,
        createdAt: new Date().toISOString(),
      },
    );
    const waste = cafeOperationsService.create<WasteRecord>("waste", {
      ...value,
      quantity,
      estimatedCost: roundMoney(quantity * item.averageCost),
      createdAt: new Date().toISOString(),
    });
    cafeOperationsService.audit({
      module: "inventory",
      action: "WASTE_CREATED",
      description: `تم تسجيل هالك ${quantity} ${item.unit} من ${item.name}`,
      entityType: "waste",
      entityId: waste.id,
    });
    notifyChanged();
    return { waste, movement };
  },
  receivePurchase(purchaseId: string) {
    const purchases = cafeOperationsRepository.get<Purchase>("purchases");
    const purchase = purchases.find((entry) => entry.id === purchaseId);
    if (!purchase) throw new Error("فاتورة الشراء غير موجودة.");
    if (purchase.status === "RECEIVED")
      throw new Error("تم استلام هذه الفاتورة من قبل.");
    if (purchase.status === "CANCELLED")
      throw new Error("لا يمكن استلام فاتورة ملغاة.");
    const inventory = cafeOperationsRepository.get<InventoryItem>("inventory");
    const timestamp = new Date().toISOString();
    const updated = [...inventory];
    purchase.items.forEach((line) => {
      const quantity = Number(line.quantity);
      const unitCost = Number(line.unitCost);
      if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
      )
        throw new Error("بيانات كمية أو تكلفة الشراء غير صحيحة.");
      const index = updated.findIndex(
        (item) => item.id === line.inventoryItemId,
      );
      if (index < 0)
        throw new Error("أحد عناصر الفاتورة غير موجود في مخزون الفرع.");
      const item = updated[index];
      const before = item.quantity;
      const after = roundMoney(before + quantity);
      const totalValue = before * item.averageCost + quantity * unitCost;
      updated[index] = {
        ...item,
        quantity: after,
        averageCost: after ? roundMoney(totalValue / after) : unitCost,
        updatedAt: timestamp,
      };
      cafeOperationsService.create<StockMovement>("stockMovements", {
        inventoryItemId: item.id,
        type: "PURCHASE",
        quantity,
        quantityBefore: before,
        quantityAfter: after,
        notes: purchase.invoiceNumber,
        createdAt: timestamp,
      });
    });
    cafeOperationsRepository.set("inventory", updated);
    cafeOperationsRepository.set(
      "purchases",
      purchases.map((entry) =>
        entry.id === purchaseId ? { ...entry, status: "RECEIVED" } : entry,
      ),
    );
    cafeOperationsService.audit({
      module: "purchases",
      action: "PURCHASE_RECEIVED",
      description: `تم استلام الفاتورة ${purchase.invoiceNumber}`,
      entityType: "purchase",
      entityId: purchase.id,
    });
    notifyChanged();
    return { ...purchase, status: "RECEIVED" as const };
  },
  confirmStockCount(stockCountId: string) {
    const counts = cafeOperationsRepository.get<StockCount>("stockCounts");
    const count = counts.find((entry) => entry.id === stockCountId);
    if (!count) throw new Error("عملية الجرد غير موجودة.");
    if (count.status === "CONFIRMED")
      throw new Error("تم تأكيد هذا الجرد من قبل.");
    const inventory = cafeOperationsRepository.get<InventoryItem>("inventory");
    const timestamp = new Date().toISOString();
    const updated = [...inventory];
    count.items.forEach((line) => {
      const actual = Number(line.actualQuantity);
      if (!Number.isFinite(actual) || actual < 0)
        throw new Error("الكمية الفعلية في الجرد غير صحيحة.");
      const index = updated.findIndex(
        (item) => item.id === line.inventoryItemId,
      );
      if (index < 0) throw new Error("أحد عناصر الجرد غير موجود.");
      const item = updated[index];
      const difference = roundMoney(actual - item.quantity);
      if (difference)
        cafeOperationsService.create<StockMovement>("stockMovements", {
          inventoryItemId: item.id,
          type: "ADJUSTMENT",
          quantity: Math.abs(difference),
          quantityBefore: item.quantity,
          quantityAfter: actual,
          notes: count.number,
          createdAt: timestamp,
        });
      updated[index] = { ...item, quantity: actual, updatedAt: timestamp };
    });
    cafeOperationsRepository.set("inventory", updated);
    cafeOperationsRepository.set(
      "stockCounts",
      counts.map((entry) =>
        entry.id === count.id
          ? { ...entry, status: "CONFIRMED", confirmedAt: timestamp }
          : entry,
      ),
    );
    cafeOperationsService.audit({
      module: "inventory",
      action: "STOCK_COUNT_CONFIRMED",
      description: `تم تأكيد الجرد ${count.number}`,
      entityType: "stockCount",
      entityId: count.id,
    });
    notifyChanged();
    return { ...count, status: "CONFIRMED" as const, confirmedAt: timestamp };
  },
  getRecipeCost(recipe: Recipe) {
    const inventory = cafeOperationsRepository.get<InventoryItem>("inventory");
    return calculateRecipeCost(recipe, inventory);
  },
};

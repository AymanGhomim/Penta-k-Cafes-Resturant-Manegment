import { inventoryApiService } from "@/services/inventory-api.service";
import { financeApiService } from "@/services/finance-api.service";
import type { CashRegisterEntry, Shift } from "@/types/cafe-operations.types";

const expected = (openingCash: number, entries: CashRegisterEntry[]) => {
  const sum = (types: CashRegisterEntry["type"][]) => entries.filter((entry) => types.includes(entry.type)).reduce((total, entry) => total + entry.amount, 0);
  return openingCash + sum(["CASH_SALE", "CASH_IN", "SHIFT_ADJUSTMENT"]) - sum(["CASH_OUT", "EXPENSE", "REFUND"]);
};
export const shiftApiService = {
  list() { return inventoryApiService.list<Shift>("shifts"); },
  async open(employeeId: string, openingCash: number) {
    const shift = await inventoryApiService.create<Shift>("shifts", { employeeId, openingCash, openedAt: new Date().toISOString(), status: "OPEN" });
    await financeApiService.createCashMovement({ type: "OPENING_BALANCE", amount: openingCash, reason: `فتح وردية ${employeeId}` });
    return shift;
  },
  async close(shift: Shift, actualCash: number) {
    const summary = await financeApiService.getCashSummary();
    const entries = summary.entries.filter((entry) => entry.createdAt >= shift.openedAt);
    const expectedCash = expected(shift.openingCash, entries);
    return inventoryApiService.update<Shift>(shift.id, { status: "CLOSED", actualCash, expectedCash, difference: actualCash - expectedCash, closedAt: new Date().toISOString() });
  },
};

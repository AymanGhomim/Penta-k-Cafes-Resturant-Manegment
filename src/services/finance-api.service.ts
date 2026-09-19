import { httpClient } from "@/services/http-client";
import { API_ENDPOINTS } from "@/services/api-endpoints";
import { branchService } from "@/services/branch.service";
import type { CashRegisterEntry, Expense } from "@/types/cafe-operations.types";

type Envelope<T> = { success: boolean; data: T };
type BackendExpense = { id: string; tenantId: string; branchId?: string | null; category: string; amount: string | number; date: string; notes?: string | null; paymentMethod: NonNullable<Expense["paymentMethod"]>; createdAt: string; updatedAt: string };
type BackendCashEntry = { id: string; tenantId: string; branchId?: string | null; type: CashRegisterEntry["type"]; amount: string | number; reason?: string | null; orderId?: string | null; paymentId?: string | null; refundId?: string | null; expenseId?: string | null; shiftId?: string | null; employeeId?: string | null; createdAt: string };
export type CashSummary = { openingBalance: number; cashSales: number; cashIn: number; cashOut: number; expenses: number; refunds: number; adjustments: number; expectedBalance: number; entries: CashRegisterEntry[] };

const branchId = () => branchService.getActiveBranchId() ?? undefined;
const mapExpense = (item: BackendExpense): Expense => ({ ...item, branchId: item.branchId ?? undefined, notes: item.notes ?? undefined, amount: Number(item.amount), date: item.date.slice(0, 10) });
const mapEntry = (item: BackendCashEntry): CashRegisterEntry => ({ ...item, branchId: item.branchId ?? undefined, reason: item.reason ?? undefined, orderId: item.orderId ?? undefined, paymentId: item.paymentId ?? undefined, refundId: item.refundId ?? undefined, expenseId: item.expenseId ?? undefined, shiftId: item.shiftId ?? undefined, employeeId: item.employeeId ?? undefined, amount: Number(item.amount) });

export const financeApiService = {
  async listExpenses() {
    const response = await httpClient.get<Envelope<BackendExpense[]>>(API_ENDPOINTS.cafe.expenses, { params: { branchId: branchId() } });
    return response.data.data.map(mapExpense);
  },
  async createExpense(input: Pick<Expense, "category" | "amount" | "date" | "notes" | "paymentMethod">) {
    const response = await httpClient.post<Envelope<BackendExpense>>(API_ENDPOINTS.cafe.expenses, { ...input, branchId: branchId() });
    return mapExpense(response.data.data);
  },
  async updateExpense(id: string, input: Pick<Expense, "category" | "amount" | "date" | "notes" | "paymentMethod">) {
    const response = await httpClient.patch<Envelope<BackendExpense>>(`${API_ENDPOINTS.cafe.expenses}/${id}`, { ...input, branchId: branchId() });
    return mapExpense(response.data.data);
  },
  async removeExpense(id: string) { await httpClient.delete(`${API_ENDPOINTS.cafe.expenses}/${id}`); },
  async createCashMovement(input: Pick<CashRegisterEntry, "type" | "amount" | "reason">) {
    const response = await httpClient.post<Envelope<BackendCashEntry>>(API_ENDPOINTS.cafe.cashRegister, { ...input, branchId: branchId() });
    return mapEntry(response.data.data);
  },
  async getCashSummary() {
    const response = await httpClient.get<Envelope<Omit<CashSummary, "entries"> & { entries: BackendCashEntry[] }>>(API_ENDPOINTS.cafe.cashSummary, { params: { branchId: branchId() } });
    return { ...response.data.data, entries: response.data.data.entries.map(mapEntry) };
  },
};

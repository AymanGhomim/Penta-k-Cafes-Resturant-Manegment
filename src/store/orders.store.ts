"use client";

import { create } from "zustand";
import { branchService } from "@/services/branch.service";
import type {
  Order,
  OrderStatus,
} from "@/types/order.types";
import { orderApiService } from "@/services/order-api.service";

interface OrdersState {
  orders: Order[];
  tenantId: string;
  loadForTenant: (tenantId?: string) => void;
  setOrders: (orders: Order[], tenantId?: string) => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  tenantId: "",
  loadForTenant: (tenantId = "") => {
    if (!tenantId) return;
    const branchId = branchService.getActiveBranchId(tenantId) ?? undefined;
    void orderApiService.list(branchId).then((orders) => set({ tenantId, orders })).catch(() => set({ tenantId, orders: [] }));
  },
  setOrders: (orders, tenantId = "") => set({ tenantId, orders }),
  updateStatus: (orderId, status) => {
    void orderApiService.updateStatus(orderId, status).then(() => get().loadForTenant(get().tenantId));
  },
  cancelOrder: (orderId) => {
    void orderApiService.updateStatus(orderId, "CANCELLED").then(() => get().loadForTenant(get().tenantId));
  },
}));

"use client";

import { create } from "zustand";
import { cafeDataService } from "@/services/cafe-data.service";
import { branchService } from "@/services/branch.service";
import type {
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
  OrderType,
} from "@/types/order.types";
import { orderService } from "@/services/order.service";
import { orderApiService } from "@/services/order-api.service";

type ManualOrderInput = {
  orderType: OrderType;
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  paymentMethod?: Order["paymentMethod"];
  createdBy?: string;
};
interface OrdersState {
  orders: Order[];
  tenantId: string;
  loadForTenant: (tenantId?: string) => void;
  setOrders: (orders: Order[], tenantId?: string) => void;
  addOrder: (input: ManualOrderInput & { source?: OrderSource }) => Order;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  cancelOrder: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  tenantId: "",
  loadForTenant: (tenantId = cafeDataService.tenantId()) => {
    const branchId = branchService.getActiveBranchId(tenantId) ?? undefined;
    void orderApiService.list(branchId).then((orders) => set({ tenantId, orders })).catch(() => set({ tenantId, orders: [] }));
  },
  setOrders: (orders, tenantId = cafeDataService.tenantId()) => set({ tenantId, orders }),
  addOrder: (input) => {
    const tenantId = cafeDataService.tenantId();
    const branchId = branchService.getActiveBranchId(tenantId) ?? undefined;
    const order: Order = {
      id: `${tenantId}-ord-${Date.now()}`,
      orderNumber: `ORD-${String(Date.now()).slice(-4)}`,
      tenantId,
      branchId,
      tableNumber: input.tableNumber ?? 0,
      orderType: input.orderType,
      source: input.source ?? "MANUAL",
      paymentMethod: input.paymentMethod ?? "CASH",
      paymentStatus: "PENDING",
      createdBy: input.createdBy ?? "Cafe Admin",
      status: "NEW",
      items: input.items,
      subtotal: input.subtotal,
      total: input.total,
      createdAt: new Date().toISOString(),
    };
    const orders = [order, ...get().orders];
    set({ orders });
    cafeDataService.saveOrders(orders);
    return order;
  },
  updateStatus: (orderId, status) => {
    orderService.transition(orderId, status);
    set({ orders: cafeDataService.getOrders() });
  },
  cancelOrder: (orderId) => {
    orderService.cancel(orderId, "إلغاء من شاشة التشغيل");
    set({ orders: cafeDataService.getOrders() });
  },
}));

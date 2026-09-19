"use client";

import { create } from "zustand";
import type { CartItem } from "@/types/cart.types";

interface CartState {
  tenantId: string;
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}
const keyFor = (item: CartItem) =>
  item.cartId ??
  `${item.productId}:${item.variantId ?? "base"}:${(
    item.selectedModifiers ?? []
  )
    .map((modifier) => modifier.optionId)
    .sort()
    .join(",")}`;
const matches = (item: CartItem, key: string) =>
  keyFor(item) === key || (!item.cartId && item.productId === key);
export const useCartStore = create<CartState>((set, get) => ({
  tenantId: "",
  items: [],
  addItem: (item) =>
    set((state) => {
      const tenantId = item.tenantId ?? state.tenantId;
      const cartId = keyFor(item);
      const scoped = { ...item, tenantId, cartId };
      const existing =
        state.tenantId === tenantId
          ? state.items.find((current) => keyFor(current) === cartId)
          : undefined;
      return {
        tenantId,
        items: existing
          ? state.items.map((current) =>
              keyFor(current) === cartId
                ? {
                    ...current,
                    quantity: current.quantity + item.quantity,
                    notes: item.notes || current.notes,
                  }
                : current,
            )
          : [...(state.tenantId === tenantId ? state.items : []), scoped],
      };
    }),
  removeItem: (key) =>
    set((state) => ({
      items: state.items.filter((item) => !matches(item, key)),
    })),
  increaseQuantity: (key) =>
    set((state) => ({
      items: state.items.map((item) =>
        matches(item, key) ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    })),
  decreaseQuantity: (key) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          matches(item, key) ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  updateNotes: (key, notes) =>
    set((state) => ({
      items: state.items.map((item) =>
        matches(item, key) ? { ...item, notes } : item,
      ),
    })),
  clearCart: () => set({ tenantId: "", items: [] }),
  getTotalItems: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
  getSubtotal: () =>
    get().items.reduce(
      (sum, item) =>
        sum +
        (item.price +
          Number(item.variantPrice ?? 0) +
          (item.addons ?? []).reduce((total, addon) => total + addon.price, 0) +
          (item.selectedModifiers ?? []).reduce(
            (total, modifier) => total + modifier.priceAdjustment,
            0,
          )) *
          item.quantity,
      0,
    ),
}));

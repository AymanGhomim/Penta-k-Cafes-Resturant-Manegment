"use client";

import { create } from "zustand";

interface SettingsState { tenantId: string; serviceTaxPercent: number; loadForTenant: (tenantId?: string) => void; setServiceTaxPercent: (value: number) => void; getServiceTaxAmount: (subtotal: number) => number; getTotalWithServiceTax: (subtotal: number) => number; }
export const useSettingsStore = create<SettingsState>((set, get) => ({
  tenantId: "", serviceTaxPercent: 0,
  loadForTenant: (tenantId = "") => { set({ tenantId, serviceTaxPercent: 0 }); },
  setServiceTaxPercent: (value) => { const safe = Math.max(0, Math.min(100, value)); set({ serviceTaxPercent: safe }); },
  getServiceTaxAmount: (subtotal) => Math.round(subtotal * (get().serviceTaxPercent / 100)),
  getTotalWithServiceTax: (subtotal) => subtotal + Math.round(subtotal * (get().serviceTaxPercent / 100)),
}));

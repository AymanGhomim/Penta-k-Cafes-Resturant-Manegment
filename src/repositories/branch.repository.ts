import type { Branch, Menu, MenuItem } from "@/types/branch.types";
const remoteBranches = new Map<string, Branch[]>();

function getBranches(tenantId: string) { return remoteBranches.get(tenantId) ?? []; }

export const branchRepository = {
  setRemoteBranches: (tenantId: string, branches: Branch[]) => remoteBranches.set(tenantId, branches),
  getBranches,
  saveBranches: (_tenantId: string, branches: Branch[]) => branches,
  getMenus: (_tenantId: string) => [] as Menu[],
  saveMenus: (_tenantId: string, menus: Menu[]) => menus,
  getMenuItems: (_tenantId: string) => [] as MenuItem[],
  saveMenuItems: (_tenantId: string, items: MenuItem[]) => items,
  getActiveBranchId: (tenantId: string) => remoteBranches.get(tenantId)?.[0]?.id ?? null,
  setActiveBranchId: (_tenantId: string, branchId: string | null) => branchId,
};

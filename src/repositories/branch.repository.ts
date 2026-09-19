import { tenantStorage } from "@/repositories/tenant-storage";
import type { Branch, Menu, MenuItem } from "@/types/branch.types";
import {
  developmentBranches,
  developmentMenuItems,
  developmentMenus,
  forTenant,
} from "@shared/development-data";

const branchSeeds = (tenantId: string): Branch[] => process.env.NODE_ENV === "production" ? [] : forTenant(developmentBranches, tenantId);
const menuSeeds = (tenantId: string): Menu[] => process.env.NODE_ENV === "production" ? [] : forTenant(developmentMenus, tenantId);
const itemSeeds = (tenantId: string): MenuItem[] => process.env.NODE_ENV === "production" ? [] : forTenant(developmentMenuItems, tenantId);
const remoteBranches = new Map<string, Branch[]>();

function getBranches(tenantId: string) {
  if (process.env.NODE_ENV === "production") return remoteBranches.get(tenantId) ?? [];
  const stored = tenantStorage.get<Branch[]>(
    tenantId,
    "branches",
    branchSeeds(tenantId),
  );
  if (tenantId !== "tenant-golden-drip") return stored;

  let primary =
    stored.find((branch) => branch.id === "branch-golden-nasr") ??
    stored[0] ??
    branchSeeds(tenantId)[0];
  const contactMigrationDone = tenantStorage.get<boolean>(
    tenantId,
    "migration:golden-branch-kafr-v1",
    false,
  );
  if (primary && !contactMigrationDone) {
    primary = {
      ...primary,
      name: "فرع كفر الشيخ",
      code: "KFS",
      phone: "01050555375",
      address: "كفر الشيخ، شارع الاستاد أمام بوابة سيتي كلوب الخلفية",
      updatedAt: new Date().toISOString(),
    };
    tenantStorage.set(
      tenantId,
      "migration:golden-branch-kafr-v1",
      true,
    );
  }
  const normalized = primary ? [primary] : [];
  if (
    stored.length !== normalized.length ||
    stored[0]?.id !== normalized[0]?.id ||
    stored[0]?.name !== normalized[0]?.name ||
    stored[0]?.address !== normalized[0]?.address
  )
    tenantStorage.set(tenantId, "branches", normalized);
  return normalized;
}

export const branchRepository = {
  setRemoteBranches: (tenantId: string, branches: Branch[]) => remoteBranches.set(tenantId, branches),
  getBranches,
  saveBranches: (tenantId: string, branches: Branch[]) =>
    tenantStorage.set(tenantId, "branches", branches),
  getMenus: (tenantId: string) => process.env.NODE_ENV === "production" ? [] : tenantStorage.get<Menu[]>(tenantId, "menus", menuSeeds(tenantId)),
  saveMenus: (tenantId: string, menus: Menu[]) =>
    tenantStorage.set(tenantId, "menus", menus),
  getMenuItems: (tenantId: string) => process.env.NODE_ENV === "production" ? [] : tenantStorage.get<MenuItem[]>(tenantId, "menu-items", itemSeeds(tenantId)),
  saveMenuItems: (tenantId: string, items: MenuItem[]) =>
    tenantStorage.set(tenantId, "menu-items", items),
  getActiveBranchId: (tenantId: string) =>
    tenantStorage.get<string | null>(tenantId, "active-branch", null),
  setActiveBranchId: (tenantId: string, branchId: string | null) =>
    tenantStorage.set(tenantId, "active-branch", branchId),
};

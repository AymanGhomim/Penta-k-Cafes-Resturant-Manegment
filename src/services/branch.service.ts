import { getPlanByCode } from "@/config/plans.config";
import { branchRepository } from "@/repositories/branch.repository";
import { tenantService } from "@/services/tenant.service";
import type { Branch, Menu, MenuItem } from "@/types/branch.types";
import type { Tenant } from "@/types/tenant.types";

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const tenantId = () => tenantService.requireActiveTenantId();

export function getEffectiveBranchLimit(tenant: Tenant) {
  return tenant.maxBranchesOverride ?? getPlanByCode(tenant.plan).maxBranches;
}
export function canCreateBranch(
  tenant: Tenant,
  currentCount = branchRepository.getBranches(tenant.id).length,
) {
  return currentCount < getEffectiveBranchLimit(tenant);
}

export const branchService = {
  getBranches: (id = tenantId()) => branchRepository.getBranches(id),
  getBranch: (branchId: string, id = tenantId()) =>
    branchRepository.getBranches(id).find((branch) => branch.id === branchId),
  getActiveBranchId(id = tenantId()) {
    const branches = branchRepository
      .getBranches(id)
      .filter((branch) => branch.status === "ACTIVE");
    const saved = branchRepository.getActiveBranchId(id);
    return branches.some((branch) => branch.id === saved)
      ? saved
      : (branches[0]?.id ?? null);
  },
  setActiveBranch(branchId: string | null, id = tenantId()) {
    if (
      branchId &&
      !branchRepository.getBranches(id).some((branch) => branch.id === branchId)
    )
      throw new Error("الفرع لا ينتمي إلى هذا الكافيه");
    branchRepository.setActiveBranchId(id, branchId);
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("branch:changed", {
          detail: { tenantId: id, branchId },
        }),
      );
  },
  createBranch(
    value: Omit<Branch, "id" | "tenantId" | "createdAt" | "updatedAt">,
    id = tenantId(),
  ) {
    const tenant = tenantService.getTenant(id);
    if (!tenant) throw new Error("الكافيه غير موجود");
    const branches = branchRepository.getBranches(id);
    if (!canCreateBranch(tenant, branches.length))
      throw new Error("لقد وصلت إلى الحد الأقصى للفروع المتاحة في اشتراكك.");
    const timestamp = new Date().toISOString();
    const branch: Branch = {
      ...value,
      id: makeId("branch"),
      tenantId: id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    branchRepository.saveBranches(id, [...branches, branch]);
    if (!branchRepository.getActiveBranchId(id))
      this.setActiveBranch(branch.id, id);
    return branch;
  },
  updateBranch(
    branchId: string,
    patch: Partial<Omit<Branch, "id" | "tenantId" | "createdAt">>,
    id = tenantId(),
  ) {
    const branches = branchRepository.getBranches(id);
    const next = branches.map((branch) =>
      branch.id === branchId
        ? { ...branch, ...patch, updatedAt: new Date().toISOString() }
        : branch,
    );
    branchRepository.saveBranches(id, next);
    return next.find((branch) => branch.id === branchId);
  },
  deactivateBranch: (branchId: string, id = tenantId()) =>
    branchService.updateBranch(branchId, { status: "INACTIVE" }, id),
  getMenus: (id = tenantId()) => branchRepository.getMenus(id),
  getMenu: (menuId: string, id = tenantId()) =>
    branchRepository.getMenus(id).find((menu) => menu.id === menuId),
  getMenuItems: (menuId: string, id = tenantId()) =>
    branchRepository
      .getMenuItems(id)
      .filter((item) => item.menuId === menuId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  createMenu(
    value: Omit<Menu, "id" | "tenantId" | "createdAt" | "updatedAt">,
    items: Omit<MenuItem, "id" | "tenantId" | "menuId">[] = [],
    id = tenantId(),
  ) {
    const timestamp = new Date().toISOString();
    const menu: Menu = {
      ...value,
      id: makeId("menu"),
      tenantId: id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    branchRepository.saveMenus(id, [...branchRepository.getMenus(id), menu]);
    const records = items.map((item) => ({
      ...item,
      id: makeId("menu-item"),
      tenantId: id,
      menuId: menu.id,
    }));
    branchRepository.saveMenuItems(id, [
      ...branchRepository.getMenuItems(id),
      ...records,
    ]);
    return menu;
  },
  updateMenu(
    menuId: string,
    patch: Partial<Omit<Menu, "id" | "tenantId" | "createdAt">>,
    items?: Omit<MenuItem, "id" | "tenantId" | "menuId">[],
    id = tenantId(),
  ) {
    branchRepository.saveMenus(
      id,
      branchRepository
        .getMenus(id)
        .map((menu) =>
          menu.id === menuId
            ? { ...menu, ...patch, updatedAt: new Date().toISOString() }
            : menu,
        ),
    );
    if (items)
      branchRepository.saveMenuItems(id, [
        ...branchRepository
          .getMenuItems(id)
          .filter((item) => item.menuId !== menuId),
        ...items.map((item) => ({
          ...item,
          id: makeId("menu-item"),
          tenantId: id,
          menuId,
        })),
      ]);
  },
  duplicateMenu(menuId: string, name: string, id = tenantId()) {
    const menu = this.getMenu(menuId, id);
    if (!menu) throw new Error("المنيو غير موجودة");
    return this.createMenu(
      { name, description: menu.description, status: "ACTIVE" },
      this.getMenuItems(menuId, id).map(
        ({ price, available, sortOrder, productId }) => ({
          price,
          available,
          sortOrder,
          productId,
        }),
      ),
      id,
    );
  },
  removeMenu(menuId: string, id = tenantId()) {
    if (
      branchRepository
        .getBranches(id)
        .some((branch) => branch.menuId === menuId)
    )
      throw new Error("لا يمكن حذف المنيو لأنها مستخدمة في فرع أو أكثر.");
    branchRepository.saveMenus(
      id,
      branchRepository.getMenus(id).filter((menu) => menu.id !== menuId),
    );
    branchRepository.saveMenuItems(
      id,
      branchRepository
        .getMenuItems(id)
        .filter((item) => item.menuId !== menuId),
    );
  },
  assignMenuToBranch(branchId: string, menuId: string, id = tenantId()) {
    if (!this.getMenu(menuId, id)) throw new Error("المنيو غير موجودة");
    return this.updateBranch(branchId, { menuId }, id);
  },
};

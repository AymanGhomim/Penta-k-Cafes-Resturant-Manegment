import type { ModifierGroup } from "@/types/cafe-operations.types";
let remoteGroups: ModifierGroup[] = [];

export type ModifierSelection = { groupId: string; optionIds: string[] };

export const modifierService = {
  getGroups: () => remoteGroups,
  setGroups: (groups: ModifierGroup[]) => { remoteGroups = groups; },
  getForProduct(productId: string) {
    return this.getGroups()
      .filter((group) => group.active && group.productIds.includes(productId))
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  },
  validateAndSnapshot(productId: string, selections: ModifierSelection[]) {
    const groups = this.getForProduct(productId);
    const snapshots: NonNullable<
      import("@/types/cart.types").CartItem["selectedModifiers"]
    > = [];
    groups.forEach((group) => {
      const selectedIds =
        selections.find((item) => item.groupId === group.id)?.optionIds ?? [];
      const unique = Array.from(new Set(selectedIds));
      if (group.required && unique.length < Math.max(1, group.minSelections))
        throw new Error(`اختر ${group.name} قبل الإضافة.`);
      if (
        unique.length < group.minSelections ||
        unique.length > group.maxSelections
      )
        throw new Error(`عدد الاختيارات في ${group.name} غير صحيح.`);
      unique.forEach((optionId) => {
        const option = group.options.find((item) => item.id === optionId);
        if (!option || !option.available)
          throw new Error(`أحد اختيارات ${group.name} غير متاح.`);
        snapshots.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceAdjustment: option.priceAdjustment,
        });
      });
    });
    return snapshots;
  },
};

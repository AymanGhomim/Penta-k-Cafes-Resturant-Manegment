"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useTenant } from "@/providers/tenant-provider";
import { branchService } from "@/services/branch.service";
import { branchApiService } from "@/services/branch-api.service";
import { useCartStore } from "@/store/cart.store";
import { useOrdersStore } from "@/store/orders.store";
import type { Branch } from "@/types/branch.types";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { employeeService } from "@/services/employee.service";
import { useCustomerRoute } from "@/providers/customer-route-provider";

type BranchContextValue = {
  branch: Branch | null;
  branches: Branch[];
  loading: boolean;
  setActiveBranch: (branchId: string) => void;
  refreshBranches: () => void;
};
const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const { employee } = useCurrentEmployee();
  const customerRoute = useCustomerRoute();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshBranches = useCallback(() => {
    void (async () => {
      let all;
      try {
        all = await branchApiService.list();
      } catch {
        all = branchService.getBranches(tenant.id);
      }
      const next = employee
        ? employeeService.getAccessibleBranches(employee, tenant.id).filter((item) => all.some((remote) => remote.id === item.id))
        : all;
      const saved = branchService.getActiveBranchId(tenant.id);
      const requestedBranchId = customerRoute.context?.branch.id;
      const validBranchId = requestedBranchId && next.some((item) => item.id === requestedBranchId)
        ? requestedBranchId
        : next.some((item) => item.id === saved)
          ? saved
          : (next.find((item) => item.status === "ACTIVE")?.id ?? null);
      if (validBranchId !== saved)
        branchService.setActiveBranch(validBranchId, tenant.id);
      setBranches(next);
      setBranchId(validBranchId);
      setLoading(false);
    })();
  }, [customerRoute.context?.branch.id, employee, tenant.id]);
  useEffect(() => {
    setLoading(true);
    refreshBranches();
  }, [refreshBranches]);
  useEffect(() => {
    const refresh = () => refreshBranches();
    window.addEventListener("branch:data-changed", refresh);
    return () => window.removeEventListener("branch:data-changed", refresh);
  }, [refreshBranches]);
  const setActiveBranch = useCallback(
    (nextId: string) => {
      if (nextId === branchId) return;
      if (!branches.some((item) => item.id === nextId)) {
        toast.error("ليس لديك صلاحية للوصول إلى هذا الفرع.");
        return;
      }
      branchService.setActiveBranch(nextId, tenant.id);
      setBranchId(nextId);
      useCartStore.getState().clearCart();
      useOrdersStore.getState().loadForTenant(tenant.id);
      toast.success("تم تغيير الفرع وإعادة تعيين الطلب الحالي.");
    },
    [branchId, branches, tenant.id],
  );
  const branch = useMemo(
    () => branches.find((item) => item.id === branchId) ?? null,
    [branchId, branches],
  );
  return (
    <BranchContext.Provider
      value={{ branch, branches, loading, setActiveBranch, refreshBranches }}
    >
      {children}
    </BranchContext.Provider>
  );
}
export function useBranch() {
  const value = useContext(BranchContext);
  if (!value) throw new Error("useBranch must be used within BranchProvider");
  return value;
}

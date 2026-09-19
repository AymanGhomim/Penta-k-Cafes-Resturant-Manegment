"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/access-control";
import { useTenant } from "@/providers/tenant-provider";
import { employeeApiService, type BackendRole } from "@/services/employee-api.service";
import { useAuthStore } from "@/store/auth.store";
import type { CafeEmployee, CafeRole, PermissionKey } from "@/types/access-control.types";

type CurrentEmployeeValue = {
  employee: CafeEmployee | null;
  role: CafeRole | null;
  permissions: PermissionKey[];
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  refresh: () => void;
};

const CurrentEmployeeContext = createContext<CurrentEmployeeValue | null>(null);

export function CurrentEmployeeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const user = useAuthStore((state) => state.user);
  const [revision, setRevision] = useState(0);
  const [employees, setEmployees] = useState<Awaited<ReturnType<typeof employeeApiService.list>>>([]);
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    void Promise.all([employeeApiService.list(), employeeApiService.roles()]).then(([nextEmployees, nextRoles]) => { setEmployees(nextEmployees); setRoles(nextRoles); }).catch(() => { setEmployees([]); setRoles([]); });
    const handleChange = () => refresh();
    window.addEventListener("access-control:changed", handleChange);
    window.addEventListener("tenant:changed", handleChange);
    return () => {
      window.removeEventListener("access-control:changed", handleChange);
      window.removeEventListener("tenant:changed", handleChange);
    };
  }, []);

  const value = useMemo(() => {
    void revision;
    const employee = user?.employeeId ? employees.find((item) => item.id === user.employeeId) ?? null : employees.find((item) => item.role === "OWNER") ?? null;
    const roleRecord = employee ? roles.find((item) => item.code === employee.role) : roles.find((item) => item.code === "OWNER");
    const role = roleRecord ? { id: roleRecord.code, tenantId: tenant.id, code: roleRecord.code as CafeRole["code"], name: roleRecord.name, systemRole: true, permissions: roleRecord.permissions as PermissionKey[], createdAt: new Date(0).toISOString(), updatedAt: new Date().toISOString() } : null;
    const mappedEmployee = employee ? { id: employee.id, tenantId: employee.tenantId, name: employee.name, phone: "", email: employee.email, roleId: employee.role, branchAccess: "ALL" as const, branchIds: [], status: employee.status, createdAt: employee.createdAt, updatedAt: employee.updatedAt } : null;
    const permissions = role?.permissions ?? [];
    return {
      employee: mappedEmployee,
      role,
      permissions,
      hasPermission: (permission: PermissionKey) => hasPermission(permissions, permission),
      hasAnyPermission: (required: PermissionKey[]) => hasAnyPermission(permissions, required),
      hasAllPermissions: (required: PermissionKey[]) => hasAllPermissions(permissions, required),
      refresh,
    };
  }, [employees, revision, roles, tenant.id, user]);

  return <CurrentEmployeeContext.Provider value={value}>{children}</CurrentEmployeeContext.Provider>;
}

export function useCurrentEmployee() {
  const value = useContext(CurrentEmployeeContext);
  if (!value) throw new Error("useCurrentEmployee must be used within CurrentEmployeeProvider");
  return value;
}

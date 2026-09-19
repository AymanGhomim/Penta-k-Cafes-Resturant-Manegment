import type { CafeEmployee, CafeRole } from "@/types/access-control.types";

export const accessControlRepository = {
  getRoles: (_tenantId: string) => [] as CafeRole[],
  saveRoles: (_tenantId: string, roles: CafeRole[]) => roles,
  getEmployees: (_tenantId: string) => [] as CafeEmployee[],
  saveEmployees: (_tenantId: string, employees: CafeEmployee[]) => employees,
};

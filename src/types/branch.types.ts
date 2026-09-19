export type BranchStatus = "ACTIVE" | "INACTIVE";
export type MenuStatus = "ACTIVE" | "INACTIVE";

export type BranchSettings = {
  dineInEnabled: boolean;
  takeawayEnabled: boolean;
  deliveryEnabled: boolean;
  preparationTime: number;
  openingHours?: string;
  cashierQr?: { orderType: "TABLE" | "TAKEAWAY" | "DELIVERY"; tableId?: string };
};

export type Branch = {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: BranchStatus;
  menuId?: string;
  settings?: BranchSettings;
  createdAt: string;
  updatedAt: string;
};

export type Menu = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: MenuStatus;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  id: string;
  tenantId: string;
  menuId: string;
  productId: string;
  price: number;
  available: boolean;
  sortOrder: number;
};

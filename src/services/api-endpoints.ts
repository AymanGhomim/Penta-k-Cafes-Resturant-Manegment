export const API_ENDPOINTS = {
  auth: {
    platformLogin: "/auth/platform/login",
    cafeLogin: "/auth/cafe/login",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },
  platform: { tenants: "/platform/tenants", dashboard: "/platform/dashboard", plans: "/platform/plans", activityLogs: "/platform/activity-logs", users: "/platform/users", roles: "/platform/roles", uploads: "/platform/uploads" },
  cafe: {
    tenant: "/cafe/tenant",
    branches: "/cafe/branches",
    categories: "/cafe/categories",
    products: "/cafe/products",
    menus: "/cafe/menus",
    dashboard: "/cafe/dashboard",
    reports: "/cafe/reports",
  },
  menu: {
    public: "/public/menu",
  },
  products: {
    root: "/products",
  },
  categories: {
    root: "/categories",
  },
  orders: {
    root: "/cafe/orders",
  },
  tables: {
    root: "/cafe/tables",
  },
} as const;

export const API_ENDPOINTS = {
  auth: {
    platformLogin: "/auth/platform/login",
    cafeLogin: "/auth/cafe/login",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },
  platform: { tenants: "/platform/tenants" },
  cafe: {
    branches: "/cafe/branches",
    categories: "/cafe/categories",
    products: "/cafe/products",
    menus: "/cafe/menus",
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

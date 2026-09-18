export const API_ENDPOINTS = {
  auth: {
    platformLogin: "/auth/platform/login",
    me: "/auth/me",
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
    root: "/orders",
  },
  tables: {
    root: "/tables",
  },
} as const;

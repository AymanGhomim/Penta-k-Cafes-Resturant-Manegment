export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Cafe Management System",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://penta-k-cafes-resturant-manegment-b.vercel.app/api/v1",
  defaultCurrency: "EGP",
  currencySymbol: "ج.م",
  itemsPerPage: 10,
} as const;

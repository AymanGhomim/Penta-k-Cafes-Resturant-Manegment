export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "ARCHIVED";
export type AdminClientMode = "WEB" | "DESKTOP" | "BOTH";
export type ClientType = "WEB" | "DESKTOP";
export type SubscriptionPlan =
  "STARTER" | "GROWTH" | "ENTERPRISE" | (string & {});
export type SubscriptionStatus =
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export type TenantBranding = {
  logo: string;
  favicon?: string;
  lightLogo?: string;
  darkLogo?: string;
  primary: string;
  primaryForeground?: string;
  secondary: string;
  secondaryForeground?: string;
  accent: string;
  accentForeground?: string;
  background: string;
  surface: string;
  surfaceSecondary?: string;
  sidebar: string;
  sidebarText: string;
  sidebarActive?: string;
  sidebarActiveForeground?: string;
  textPrimary: string;
  textSecondary: string;
  muted?: string;
  border: string;
  radius: string;
  fontFamily?: string;
  login?: {
    backgroundColor: string;
    backgroundImage?: string;
    welcomeTitle: string;
    subtitle: string;
    cardStyle: "solid" | "glass";
  };
  menu?: { categoryAccent: string; headerText?: string };
  receipt?: {
    phone?: string;
    address?: string;
    taxNumber?: string;
    header?: string;
    footer?: string;
    showQr: boolean;
  };
  qr?: { foregroundColor: string; title: string; helperText: string };
};

export type TenantSettings = {
  currency: string;
  currencySymbol: string;
  timezone: string;
  locale: "ar" | "en";
  taxRate: number;
};

export type TenantFeatures = {
  [key: string]: boolean | undefined;
  onlineMenu: boolean;
  qrOrdering: boolean;
  delivery: boolean;
  inventory: boolean;
  reports: boolean;
  pos?: boolean;
  orders?: boolean;
  tables?: boolean;
  kitchen?: boolean;
  takeaway?: boolean;
  recipes?: boolean;
  suppliers?: boolean;
  purchases?: boolean;
  expenses?: boolean;
  loyalty?: boolean;
  employees?: boolean;
  advancedReports?: boolean;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  legalName?: string;
  status: TenantStatus;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  adminClientMode: AdminClientMode;
  branding: TenantBranding;
  settings: TenantSettings;
  features: TenantFeatures;
  createdAt: string;
  owner?: { name: string; email: string; phone?: string; username?: string };
  contact?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    locationUrl?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  subscription?: { type: "TRIAL" | "PAID"; startsAt: string; endsAt: string };
  featureOverrides?: Partial<Record<string, boolean>>;
  maxBranchesOverride?: number;
  branches?: TenantBranch[];
  menus?: TenantMenu[];
};

export type TenantMenu = { id: string; name: string; description?: string | null; status?: string; branchId?: string | null };
export type TenantBranch = { id: string; name: string; code?: string | null; phone?: string | null; address?: string | null; status: "ACTIVE" | "INACTIVE"; menuId?: string | null; menu?: TenantMenu | null; createdAt: string };

export type TenantUserContext = {
  userId: string;
  tenantId: string;
  role: "admin" | "kitchen" | "platform_super_admin";
};

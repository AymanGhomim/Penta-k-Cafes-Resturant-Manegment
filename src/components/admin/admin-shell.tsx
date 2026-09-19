"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { LogOut, MapPin, Menu } from "lucide-react";
import { AdminClientUnavailableState } from "@/components/access/admin-client-unavailable-state";
import {
  FeatureUnavailableState,
  PermissionDeniedState,
} from "@/components/access/access-state";
import { CafeAdminSidebar } from "@/components/layout/cafe-admin-sidebar";
import { AdminCommandMenu } from "@/components/layout/admin-command-menu";
import { AdminTableExperience } from "@/components/admin/admin-table-experience";
import {
  adminNavigationGroups,
  adminPrimaryNavigation,
} from "@/components/layout/admin-navigation";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import {
  getEffectiveTenantFeatures,
  getRequiredFeatureForRoute,
} from "@/config/feature-access.config";
import { getRoutePermission } from "@/config/permissions.config";
import { isAdminClientAllowed } from "@/lib/admin-client-mode";
import { useBranch } from "@/providers/branch-provider";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { useTenant } from "@/providers/tenant-provider";
import { branchService } from "@/services/branch.service";
import { operationsApiService } from "@/services/operations-api.service";
import { orderApiService } from "@/services/order-api.service";
import { useAuthStore } from "@/store/auth.store";

const AdminShellNestingContext = createContext(false);
const branchRequiredRoutes = [
  "/admin/dashboard",
  "/admin/pos",
  "/admin/orders",
  "/admin/tables",
  "/admin/qr",
  "/admin/inventory",
  "/admin/stock-",
  "/admin/waste",
  "/admin/purchases",
  "/admin/expenses",
  "/admin/payments",
  "/admin/refunds",
  "/admin/cash-register",
  "/admin/shifts",
  "/admin/delivery-zones",
  "/admin/waiter-requests",
  "/kitchen/orders",
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const alreadyInsideShell = useContext(AdminShellNestingContext);
  if (alreadyInsideShell) return <>{children}</>;
  return (
    <AdminShellNestingContext.Provider value>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminShellNestingContext.Provider>
  );
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant } = useTenant();
  const { branch, branches, setActiveBranch } = useBranch();
  const singleBranchCafe = branchService.getBranches(tenant.id).length === 1;
  const { employee, role, hasPermission } = useCurrentEmployee();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [ready, setReady] = useState(() => useAuthStore.persist.hasHydrated());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [desktopOpen, setDesktopOpen] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem("admin:sidebar-collapsed") !== "true",
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "sales-menu": true,
  });

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    void Promise.resolve(useAuthStore.persist.rehydrate()).finally(() =>
      setReady(true),
    );
  }, []);
  useEffect(() => {
    if (ready && !authenticated) router.replace("/admin/login");
  }, [authenticated, ready, router]);
  useEffect(() => {
    const active = adminNavigationGroups.find((group) =>
      group.items.some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    );
    if (active)
      setOpenGroups({ [active.key]: true });
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    window.localStorage.setItem(
      "admin:sidebar-collapsed",
      String(!desktopOpen),
    );
  }, [desktopOpen]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    if (!employee) {
      setFavoriteHrefs([]);
      return;
    }
    const key = `admin:favorites:${tenant.id}:${employee.id}`;
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
      setFavoriteHrefs(Array.isArray(stored) ? stored : []);
    } catch {
      setFavoriteHrefs([]);
    }
  }, [employee, tenant.id]);
  useEffect(() => {
    const updateBadges = () => {
      void Promise.all([
        branch ? orderApiService.list(branch.id) : Promise.resolve([]),
        operationsApiService.list("waiterRequests").catch(() => []),
        operationsApiService.list("notifications").catch(() => []),
      ]).then(([orders, requests, notifications]) => {
      setBadgeCounts({
        "/admin/orders": orders.filter((item) => item.status === "NEW").length,
        "/kitchen/orders": orders.filter((item) =>
          ["NEW", "PREPARING"].includes(item.status),
        ).length,
        "/admin/waiter-requests": (requests as { status?: string }[]).filter((item) => item.status === "NEW").length,
        "/admin/notifications": (notifications as { read?: boolean }[]).filter((item) => !item.read).length,
      });
      });
    };
    updateBadges();
    window.addEventListener("operations:changed", updateBadges);
    window.addEventListener("orders:changed", updateBadges);
    window.addEventListener("branch:changed", updateBadges);
    const interval = window.setInterval(updateBadges, 30000);
    return () => {
      window.removeEventListener("operations:changed", updateBadges);
      window.removeEventListener("orders:changed", updateBadges);
      window.removeEventListener("branch:changed", updateBadges);
      window.clearInterval(interval);
    };
  }, [branch, tenant.id]);

  const signOut = () => {
    logout();
    router.replace("/admin/login");
  };
  if (!ready || !authenticated)
    return <main className="min-h-screen bg-background" />;
  if (!isAdminClientAllowed(tenant.adminClientMode, "WEB"))
    return <AdminClientUnavailableState onExit={signOut} />;
  if (!employee || !role)
    return (
      <AccountState
        title="تعذر تحديد حساب الموظف"
        description="سجّل الدخول مرة أخرى باستخدام حساب موظف تابع لهذا الكافيه."
        action="العودة لتسجيل الدخول"
        onExit={signOut}
      />
    );
  if (employee.status === "SUSPENDED")
    return (
      <AccountState
        title="الحساب موقوف"
        description="تم إيقاف هذا الحساب. يرجى التواصل مع إدارة الكافيه."
        action="تسجيل الخروج"
        onExit={signOut}
      />
    );
  if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED")
    return (
      <main
        dir="rtl"
        lang="ar"
        className="flex min-h-screen items-center justify-center bg-[var(--tenant-background)] p-6"
      >
        <div className="max-w-md rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-8 text-center shadow-lg">
          <AppLogo />
          <h1 className="mt-6 text-2xl font-black">
            {tenant.status === "SUSPENDED" ? "الحساب موقوف" : "انتهى الاشتراك"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            تواصل مع مسؤول المنصة لإعادة تفعيل حساب الكافيه.
          </p>
          <Button className="mt-6" onClick={signOut}>
            تسجيل الخروج
          </Button>
        </div>
      </main>
    );

  const effectiveFeatures = getEffectiveTenantFeatures(tenant);
  const requiredFeature = getRequiredFeatureForRoute(pathname);
  const requiredPermission = getRoutePermission(pathname);
  const requiresBranch = branchRequiredRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const visibleGroups = adminNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (singleBranchCafe && item.href === "/admin/branches") return false;
        const feature = getRequiredFeatureForRoute(item.href);
        const permission = getRoutePermission(item.href);
        return (
          (!feature || effectiveFeatures[feature]) &&
          (!permission || hasPermission(permission))
        );
      }),
    }))
    .filter((group) => group.items.length > 0);
  const visiblePrimaryItems = adminPrimaryNavigation.filter((item) => {
    const feature = getRequiredFeatureForRoute(item.href);
    const permission = getRoutePermission(item.href);
    return (
      (!feature || effectiveFeatures[feature]) &&
      (!permission || hasPermission(permission))
    );
  });
  const commandItems = [
    ...visiblePrimaryItems,
    ...visibleGroups.flatMap((group) => group.items),
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.href === item.href) === index,
  );
  const favoriteItems = favoriteHrefs
    .map((href) => commandItems.find((item) => item.href === href))
    .filter((item): item is (typeof commandItems)[number] => Boolean(item));
  const toggleFavorite = (href: string) => {
    if (!employee) return;
    setFavoriteHrefs((current) => {
      const next = current.includes(href)
        ? current.filter((item) => item !== href)
        : [...current, href].slice(-5);
      window.localStorage.setItem(
        `admin:favorites:${tenant.id}:${employee.id}`,
        JSON.stringify(next),
      );
      return next;
    });
  };
  const page =
    requiredPermission && !hasPermission(requiredPermission) ? (
      <PermissionDeniedState />
    ) : requiredFeature && !effectiveFeatures[requiredFeature] ? (
      <FeatureUnavailableState />
    ) : !branch && requiresBranch ? (
      <MissingBranch canManage={hasPermission("branches.manage")} />
    ) : (
      children
    );
  const sidebarProps = {
    tenantName: tenant.name,
    employeeName: employee.name,
    roleName: role.name,
    branchName: branch?.name,
    activeBranchId: branch?.id,
    branches: branches
      .filter((item) => item.status === "ACTIVE")
      .map((item) => ({ id: item.id, name: item.name })),
    singleBranch: singleBranchCafe,
    primaryItems: visiblePrimaryItems,
    favoriteItems,
    badgeCounts,
    groups: visibleGroups,
    pathname,
    openGroups,
    onToggleGroup: (key: string) =>
      setOpenGroups((current) => (current[key] ? {} : { [key]: true })),
    onToggleCollapsed: () => setDesktopOpen((value) => !value),
    onCloseMobile: () => setMobileOpen(false),
    onBranchChange: setActiveBranch,
    onOpenSearch: () => setCommandOpen(true),
    onSignOut: signOut,
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-background lg:flex">
      <AdminCommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        favoriteHrefs={favoriteHrefs}
        onToggleFavorite={toggleFavorite}
      />
      <div className="sticky top-0 hidden h-screen shrink-0 lg:flex">
        <CafeAdminSidebar
          {...sidebarProps}
          collapsed={!desktopOpen}
          mobile={false}
        />
      </div>
      <div data-admin-workspace className="min-w-0 flex-1">
        <AdminTableExperience />
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-3 py-2.5 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <AppLogo showText={false} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={signOut}
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق القائمة"
            />
            <div className="absolute inset-y-0 right-0">
              <CafeAdminSidebar {...sidebarProps} collapsed={false} mobile />
            </div>
          </div>
        ) : null}
        {page}
      </div>
    </div>
  );
}

function AccountState({
  title,
  description,
  action,
  onExit,
}: {
  title: string;
  description: string;
  action: string;
  onExit: () => void;
}) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background p-6"
    >
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-black">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <Button className="mt-6" onClick={onExit}>
          {action}
        </Button>
      </div>
    </main>
  );
}

function MissingBranch({ canManage }: { canManage: boolean }) {
  return (
    <section
      dir="rtl"
      className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5"
    >
      <div className="w-full rounded-2xl border border-dashed bg-card p-10 text-center">
        <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-black">
          لم تتم إضافة أي فروع حتى الآن
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أضف فرعًا أولًا لبدء استخدام هذه الصفحة.
        </p>
        {canManage ? (
          <Button asChild className="mt-6">
            <Link href="/admin/branches/new">إضافة فرع</Link>
          </Button>
        ) : (
          <p className="mt-4 text-sm font-semibold">
            تواصل مع مالك الحساب لإضافة الفرع.
          </p>
        )}
      </div>
    </section>
  );
}

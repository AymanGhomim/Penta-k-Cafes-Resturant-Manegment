"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  ReceiptText,
  Settings,
  Tags,
  UserCircle,
  X,
} from "lucide-react";

import { PlatformLogo } from "@/components/platform/platform-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { authSessionService } from "@/services/auth-session.service";

const groups = [
  {
    title: "الرئيسية",
    items: [
      { href: "/platform/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    ],
  },
  {
    title: "إدارة الكافيهات",
    items: [
      { href: "/platform/tenants", label: "الكافيهات", icon: Building2 },
      { href: "/platform/tenants/new", label: "إضافة كافيه", icon: Building2 },
    ],
  },
  {
    title: "الاشتراكات",
    items: [
      { href: "/platform/plans", label: "الباقات", icon: Tags },
      { href: "/platform/subscriptions", label: "الاشتراكات", icon: ReceiptText },
    ],
  },
  {
    title: "التخصيص",
    items: [
      { href: "/platform/branding", label: "قوالب الهوية", icon: Palette },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/platform/activity-log", label: "سجل النشاط", icon: ReceiptText },
      { href: "/platform/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];
const navigationItems = groups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
);

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (pathname === "/platform/login") {
      setAuthReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await Promise.resolve(useAuthStore.persist.rehydrate());
        const current = await authSessionService.me();
        if (current.role !== "PLATFORM_OWNER") throw new Error("Invalid platform role");
        if (!cancelled) {
          login({ id: current.id, name: current.name, email: current.email, role: "platform_super_admin", tenantId: current.tenantId ?? undefined });
        }
      } catch {
        authSessionService.clear();
        logout();
        if (!cancelled) router.replace("/platform/login");
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [login, logout, pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname === "/platform/login") return <>{children}</>;
  if (!authReady || !user || user.role !== "platform_super_admin") {
    return <main className="min-h-screen bg-[#F5F5F5]" />;
  }

  const handleLogout = () => {
    logout();
    router.replace("/platform/login");
  };

  const currentPage =
    navigationItems.find((item) => item.href === pathname) ??
    (pathname.startsWith("/platform/tenants/")
      ? {
          href: "/platform/tenants",
          label: "تفاصيل الكافيه",
          icon: Building2,
          group: "إدارة الكافيهات",
        }
      : navigationItems[0]);
  const CurrentPageIcon = currentPage.icon;

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-l border-[#D1D5DB] bg-white p-5 text-[#111111] shadow-2xl">
      <div className="mb-8 px-2">
        <PlatformLogo />
        <p className="mt-4 text-xs leading-6 text-slate-400">
          مساحة تحكم موحّدة لإدارة المقاهي والمطاعم والاشتراكات.
        </p>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[0.68rem] font-black text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    currentPage.href === href
                      ? "bg-[#E5E7EB] text-[#111111]"
                      : "text-slate-600 hover:bg-[#F3F4F6] hover:text-[#111111]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

    </aside>
  );

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#F5F5F5] text-[#111111]"
      style={
        {
          "--background": "0 0% 97%",
          "--foreground": "0 0% 7%",
          "--card": "0 0% 100%",
          "--card-foreground": "0 0% 7%",
          "--popover": "0 0% 100%",
          "--popover-foreground": "0 0% 7%",
          "--primary": "0 0% 10%",
          "--primary-foreground": "0 0% 100%",
          "--secondary": "0 0% 94%",
          "--secondary-foreground": "0 0% 10%",
          "--muted": "0 0% 94%",
          "--muted-foreground": "0 0% 40%",
          "--accent": "0 0% 92%",
          "--accent-foreground": "0 0% 10%",
          "--border": "0 0% 87%",
          "--input": "0 0% 87%",
          "--ring": "0 0% 25%",
        } as React.CSSProperties
      }
    >
      <div className="fixed inset-y-0 right-0 z-30 hidden lg:flex">
        {sidebar}
      </div>

      <header className="fixed inset-x-0 top-0 z-40 flex h-20 items-center justify-between border-b border-[#E5E7EB] bg-white/95 px-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl lg:right-72 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border-[#D1D5DB] bg-white shadow-sm lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111111] text-white shadow-sm lg:grid">
            <CurrentPageIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="hidden items-center gap-1.5 text-[0.68rem] font-bold text-[#98A2B3] sm:flex">
              <span>Penta-K</span>
              <span>/</span>
              <span>{currentPage.group}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="truncate text-base font-black text-[#101828] sm:text-lg">
                {currentPage.label}
              </h1>
              <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-black text-emerald-700 lg:inline-flex">
                متصل
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden border-l border-[#E5E7EB] pl-3 text-left lg:block">
            <p className="text-xs font-black text-[#344054]">{user.name}</p>
            <p className="mt-0.5 text-[0.65rem] font-medium text-[#98A2B3]">مدير المنصة</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-full border-[#D1D5DB] bg-white p-1.5 pl-2 text-[#111111] shadow-sm transition hover:border-[#98A2B3] hover:bg-[#F9FAFB] hover:text-[#111111]"
                aria-label="فتح الملف الشخصي"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#111111] to-[#475467] text-xs font-black text-white shadow-sm">
                  {user.name.trim().charAt(0).toUpperCase() || "P"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#667085]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="relative left-6 w-64 rounded-2xl border-[#D1D5DB] bg-white p-2 text-[#111111] shadow-2xl"
            >
              <DropdownMenuLabel className="px-2 py-2 font-normal">
                <span className="flex items-start gap-2.5">
                  <UserCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#667085]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">الملف الشخصي</span>
                    <span className="mt-0.5 block truncate text-xs text-[#667085]">
                      {user.email}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-[#374151]">
                      مدير المنصة
                    </span>
                  </span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E5E7EB]" />
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-xl px-2 py-2.5 font-bold text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <div className="relative h-full">
            {sidebar}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-4 top-4 border-[#D1D5DB] bg-white text-[#111111] hover:bg-[#F3F4F6]"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <main className="min-h-screen pt-20 lg:mr-72">{children}</main>
    </div>
  );
}

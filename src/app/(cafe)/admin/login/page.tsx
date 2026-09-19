"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeTenantBranding } from "@/lib/tenant-branding";
import { useTenant } from "@/providers/tenant-provider";
import { useAuthStore } from "@/store/auth.store";
import { cafeAuthService } from "@/services/cafe-auth.service";
import { AdminClientUnavailableState } from "@/components/access/admin-client-unavailable-state";
import { isAdminClientAllowed } from "@/lib/admin-client-mode";

export default function AdminLoginPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const branding = normalizeTenantBranding(tenant.branding);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).then(() =>
      setIsReady(true),
    );
  }, []);


  useEffect(() => {
    if (isAuthenticated) router.replace("/admin/dashboard");
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady || isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    const result = await cafeAuthService.login({
      tenantCode: tenant.slug,
      login: normalizedEmail,
      password,
      clientType: "WEB",
    });
    if (!result.ok) {
      setIsSubmitting(false);
      setError(
        result.code === "CLIENT_TYPE_NOT_ALLOWED"
          ? "هذا الحساب متاح من تطبيق سطح المكتب فقط."
          : result.code === "EMPLOYEE_SUSPENDED"
            ? "تم إيقاف هذا الحساب. يرجى التواصل مع إدارة الكافيه."
            : "اسم المستخدم أو كلمة المرور غير صحيحة.",
      );
      return;
    }
    const authenticatedEmployee = result.employee;

    setError("");
    await Promise.resolve(useAuthStore.persist.rehydrate());
    login({
      id: authenticatedEmployee.id,
      name: authenticatedEmployee.name,
      email: normalizedEmail,
      role: "admin",
      tenantId: tenant.id,
      employeeId: authenticatedEmployee.id,
      clientType: "WEB",
    });
    router.replace("/admin/dashboard");
  }

  const loginBackground = branding.login?.backgroundImage
    ? {
        backgroundImage: `linear-gradient(color-mix(in srgb, var(--tenant-primary) 22%, transparent), color-mix(in srgb, var(--tenant-primary) 45%, transparent)), url("${branding.login.backgroundImage}")`,
      }
    : undefined;

  if (!isAdminClientAllowed(tenant.adminClientMode, "WEB"))
    return <AdminClientUnavailableState onExit={() => router.replace("/")} />;

  return (
    <main
      dir="rtl"
      className="flex h-dvh flex-col overflow-hidden bg-background px-4 py-4 text-foreground sm:px-8 sm:py-5"
    >
      <div className="mx-auto grid min-h-0 w-full max-w-[1080px] flex-1 overflow-hidden rounded-[calc(var(--tenant-radius)*2)] border bg-card shadow-[0_20px_55px_hsl(var(--foreground)/0.12)] lg:grid-cols-[0.9fr_1.1fr]">
        <section
          className="relative hidden min-h-0 overflow-hidden bg-secondary bg-cover bg-center text-secondary-foreground lg:block"
          style={loginBackground}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/75 via-secondary/30 to-primary/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <div className="rounded-full bg-card/70 p-3 shadow-sm backdrop-blur-sm">
              <AppLogo showText={false} className="[&_div]:h-24 [&_div]:w-24" />
            </div>
            <h2 className="mt-7 text-4xl font-bold tracking-tight">
              {branding.login?.welcomeTitle || "مرحبًا بعودتك!"}
            </h2>
            <p className="mt-3 max-w-sm text-base leading-7 text-secondary-foreground/80">
              {branding.login?.subtitle || `سجّل الدخول لإدارة ${tenant.name}.`}
            </p>
          </div>
        </section>

        <section className="relative flex min-h-0 items-center overflow-hidden bg-card px-6 py-5 sm:px-10 lg:-mr-8 lg:rounded-r-[calc(var(--tenant-radius)*4)] lg:px-16">
          <div className="mx-auto w-full max-w-[500px]">
            <div className="mb-4 flex justify-center lg:hidden">
              <AppLogo />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                لوحة تحكم {tenant.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                سجّل الدخول إلى حساب الإدارة
              </p>
              <div className="mx-auto mt-4 flex max-w-[190px] items-center gap-3 text-accent">
                <span className="h-px flex-1 bg-border" />
                <span className="text-sm">✦</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>

            <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-semibold" htmlFor="email">
                اسم المستخدم أو البريد الإلكتروني
                <span className="relative mt-2 block">
                  <Mail className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                  <Input
                    id="email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-[50px] rounded-lg bg-background pl-4 pr-12 text-right text-sm shadow-none"
                  />
                </span>
              </label>

              <label className="block space-y-2 text-sm font-semibold" htmlFor="password">
                كلمة المرور
                <span className="relative mt-2 block">
                  <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-[50px] rounded-lg bg-background pl-12 pr-12 text-right text-sm tracking-widest shadow-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-primary"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-5 w-5 accent-[var(--tenant-primary)]"
                  />
                  تذكرني
                </label>
                <button type="button" disabled className="cursor-not-allowed font-semibold text-accent/60">
                  نسيت كلمة المرور (غير متاح)
                </button>
              </div>

              {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}

              <Button
                type="submit"
                disabled={!isReady || isSubmitting}
                className="h-[50px] w-full rounded-lg text-sm font-semibold shadow-md"
              >
                {isSubmitting ? <Loader2 className="ml-3 h-5 w-5 animate-spin" /> : <LogIn className="ml-3 h-5 w-5" />}
                {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span className="rounded-full bg-muted px-3 py-1">أو</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                disabled
                variant="outline"
                className="h-[46px] w-full rounded-lg"
              >
                <ShieldCheck className="mr-3 h-5 w-5" />
                استخدام تسجيل دخول احتياطي
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                تحتاج مساعدة؟ <span className="font-semibold text-accent">تواصل مع مسؤول النظام</span>
              </p>
            </form>
          </div>
        </section>
      </div>

      <p className="mt-3 shrink-0 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {tenant.name}. جميع الحقوق محفوظة.
      </p>
    </main>
  );
}

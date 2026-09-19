"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isCustomerRoute } from "@/constants/customer-route";
import {
  customerContextService,
  type CustomerContextResult,
  type ResolvedCustomerContext,
} from "@/services/customer-context.service";

type CustomerRouteContextValue = {
  isCustomerRoute: boolean;
  result: CustomerContextResult | null;
  context: ResolvedCustomerContext | null;
  href: (pathname: string) => string;
};

const CustomerRouteContext = createContext<CustomerRouteContextValue | null>(null);

export function CustomerRouteProvider({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState("");
  const [result, setResult] = useState<CustomerContextResult | null>(null);

  const resolve = useCallback(() => {
    const nextPathname = window.location.pathname;
    setPathname(nextPathname);
    if (!isCustomerRoute(nextPathname)) return setResult(null);
    void customerContextService.resolve(new URLSearchParams(window.location.search)).then(setResult);
  }, []);

  useEffect(() => {
    resolve();
    window.addEventListener("popstate", resolve);
    window.addEventListener("branch:data-changed", resolve);
    window.addEventListener("tenant:changed", resolve);
    return () => {
      window.removeEventListener("popstate", resolve);
      window.removeEventListener("branch:data-changed", resolve);
      window.removeEventListener("tenant:changed", resolve);
    };
  }, [resolve]);

  const customer = isCustomerRoute(pathname);
  const context = result?.ok ? result.context : null;
  const value: CustomerRouteContextValue = {
    isCustomerRoute: customer,
    result,
    context,
    href: (nextPathname) => context ? customerContextService.href(nextPathname, context) : nextPathname,
  };

  if (customer && !result) {
    return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background"><span className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" /></main>;
  }

  if (customer && result && !result.ok) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-black">تعذر فتح المنيو</h1>
          <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
        </section>
      </main>
    );
  }

  return <CustomerRouteContext.Provider value={value}>{children}</CustomerRouteContext.Provider>;
}

export function useCustomerRoute() {
  const value = useContext(CustomerRouteContext);
  if (!value) throw new Error("useCustomerRoute must be used within CustomerRouteProvider");
  return value;
}

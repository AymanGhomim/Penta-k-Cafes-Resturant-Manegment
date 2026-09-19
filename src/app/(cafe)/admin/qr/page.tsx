"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Printer, QrCode, Save, Search } from "lucide-react";
import QRCode from "qrcode";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customerRouteHref } from "@/constants/customer-route";
import { getContrastForeground, normalizeTenantBranding } from "@/lib/tenant-branding";
import { useBranch } from "@/providers/branch-provider";
import { useTenant } from "@/providers/tenant-provider";
import { tableApiService } from "@/services/table-api.service";
import type { Table } from "@/types/table.types";
import { cashierQrService, type CashierQrConfig } from "@/services/cashier-qr.service";
import { toast } from "sonner";

function ScannableQr({ value, color, label }: { value: string; color: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    if (value)
      QRCode.toDataURL(value, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: color, light: "#FFFFFF" },
      }).then((dataUrl) => active && setSrc(dataUrl));
    return () => { active = false; };
  }, [color, value]);
  if (!src) return <div className="h-36 w-36 animate-pulse rounded-lg bg-muted" />;
  // A generated data URL is intentionally used so the exact same QR can be downloaded.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={label} className="h-36 w-36 rounded-lg border bg-white p-2" />;
}

export default function QrManagementPage() {
  const { tenant } = useTenant();
  const { branch } = useBranch();
  const branding = normalizeTenantBranding(tenant.branding);
  const requestedQrColor = branding.qr?.foregroundColor || branding.primary;
  const qrForeground = getContrastForeground(requestedQrColor) === "#FFFFFF" ? requestedQrColor : "#111827";
  const [query, setQuery] = useState("");
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [cashierConfig, setCashierConfig] = useState<CashierQrConfig>({
    orderType: "TAKEAWAY",
  });

  useEffect(() => {
    const reload = () => { if (!branch) return setAllTables([]); void tableApiService.list(branch.id).then(setAllTables).catch(() => { setAllTables([]); toast.error("تعذر تحميل طاولات الفرع من الخادم."); }); };
    window.addEventListener("tenant:changed", reload);
    window.addEventListener("branch:changed", reload);
    return () => {
      window.removeEventListener("tenant:changed", reload);
      window.removeEventListener("branch:changed", reload);
    };
  }, [branch, tenant.id]);

  useEffect(() => {
    if (!branch) return;
    setCashierConfig(cashierQrService.get(tenant.id, branch.id));
  }, [branch, tenant.id]);

  const tables = useMemo(
    () => allTables.filter((table) => String(table.number).includes(query)),
    [allTables, query],
  );
  const menuUrl = (table: Table) => {
    if (!branch) return "";
    const path = customerRouteHref("/menu", { tenantId: tenant.id, branchId: branch.id, tableId: table.id });
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  };
  const cashierMenuUrl = () => {
    if (!branch) return "";
    if (cashierConfig.orderType === "TABLE" && !cashierConfig.tableId)
      return "";
    const path = customerRouteHref("/menu", {
      tenantId: tenant.id,
      branchId: branch.id,
      orderType: cashierConfig.orderType,
      tableId:
        cashierConfig.orderType === "TABLE"
          ? cashierConfig.tableId
          : undefined,
    });
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  };
  const saveCashierQr = () => {
    if (!branch) return;
    if (cashierConfig.orderType === "TABLE" && !cashierConfig.tableId)
      return toast.error("اختر الطاولة التي سيعمل عليها QR الكاشير.");
    cashierQrService.save(tenant.id, branch.id, cashierConfig);
    toast.success("تم حفظ تخصيص QR الكاشير.");
  };
  const downloadCashierQr = async () => {
    const href = cashierMenuUrl();
    if (!href || (cashierConfig.orderType === "TABLE" && !cashierConfig.tableId))
      return toast.error("أكمل تخصيص QR أولًا.");
    const dataUrl = await QRCode.toDataURL(href, {
      width: 1024,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: qrForeground, light: "#FFFFFF" },
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${tenant.slug}-${branch?.code ?? branch?.id}-cashier-${cashierConfig.orderType.toLowerCase()}.png`;
    link.click();
  };
  const downloadQr = async (table: Table) => {
    const href = menuUrl(table);
    if (!href) return;
    const dataUrl = await QRCode.toDataURL(href, {
      width: 1024,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: qrForeground, light: "#FFFFFF" },
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${tenant.slug}-${branch?.code ?? branch?.id}-table-${table.number}.png`;
    link.click();
  };

  return (
    <AdminShell>
      <section dir="rtl" className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold text-accent">المنيو الإلكتروني</p>
            <h1 className="mt-1 text-2xl font-black">رموز QR</h1>
            <p className="mt-1 text-sm text-muted-foreground">كل رابط مرتبط بالكافيه والفرع والطاولة الحالية.</p>
          </div>
          <PermissionGate permission="qr.manage">
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" />طباعة الصفحة
            </Button>
          </PermissionGate>
        </div>
        <Card className="mb-6 overflow-hidden rounded-2xl border-2 border-primary/15">
          <CardContent className="grid gap-6 p-5 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="flex flex-col items-center rounded-xl bg-muted/40 p-4 text-center">
              <AppLogo showText={false} size="sm" />
              <div className="mt-3">
                <ScannableQr
                  value={cashierMenuUrl()}
                  color={qrForeground}
                  label="QR الكاشير"
                />
              </div>
              <p className="mt-3 text-sm font-black">QR الكاشير</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tenant.name} · {branch?.name}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black">تخصيص QR الموجود عند الكاشير</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                الوضع الافتراضي تيك أواي ولا يحتوي الرابط على رقم طاولة. يمكنك تخصيصه للتوصيل أو ربطه بطاولة محددة.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  نوع الطلب
                  <select
                    value={cashierConfig.orderType}
                    onChange={(event) => {
                      const orderType = event.target.value as CashierQrConfig["orderType"];
                      setCashierConfig((current) => ({
                        orderType,
                        tableId: orderType === "TABLE" ? current.tableId : undefined,
                      }));
                    }}
                    className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="TAKEAWAY">تيك أواي — الافتراضي</option>
                    <option value="DELIVERY">توصيل</option>
                    <option value="TABLE">طاولة محددة</option>
                  </select>
                </label>
                {cashierConfig.orderType === "TABLE" ? (
                  <label className="text-sm font-bold">
                    الطاولة
                    <select
                      value={cashierConfig.tableId ?? ""}
                      onChange={(event) => setCashierConfig((current) => ({ ...current, tableId: event.target.value || undefined }))}
                      className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
                    >
                      <option value="">اختر الطاولة</option>
                      {allTables.filter((table) => table.isActive).map((table) => (
                        <option key={table.id} value={table.id}>طاولة {table.number}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <PermissionGate permission="qr.manage">
                  <Button type="button" onClick={saveCashierQr}>
                    <Save className="ml-2 h-4 w-4" />حفظ التخصيص
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void downloadCashierQr()}>
                    <Download className="ml-2 h-4 w-4" />تحميل QR الكاشير
                  </Button>
                </PermissionGate>
                {cashierMenuUrl() ? (
                  <Button asChild type="button" variant="outline">
                    <a href={cashierMenuUrl()} target="_blank" rel="noreferrer">
                      <ExternalLink className="ml-2 h-4 w-4" />فتح الرابط
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث برقم الطاولة" className="pr-9" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tables.map((table) => (
            <Card key={table.id} className="overflow-hidden rounded-xl">
              <CardContent className="p-4">
                <div className="mb-3 flex justify-center"><AppLogo showText={false} size="sm" /></div>
                <div className="flex justify-center"><ScannableQr value={menuUrl(table)} color={qrForeground} label={`رمز QR للطاولة ${table.number}`} /></div>
                <div className="mt-4 text-center">
                  <h2 className="font-black">طاولة {String(table.number).padStart(2, "0")}</h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{tenant.name} · {branch?.name}</p>
                  <p className="mt-2 text-xs font-bold text-primary">{branding.qr?.title || "افتح المنيو"}</p>
                  {branding.qr?.helperText ? <p className="mt-1 text-[11px] text-muted-foreground">{branding.qr.helperText}</p> : null}
                  <span className="mt-2 inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">نشط</span>
                </div>
                <Button asChild type="button" variant="outline" className="mt-4 w-full">
                  <a href={menuUrl(table)} target="_blank" rel="noreferrer"><ExternalLink className="ml-2 h-4 w-4" />فتح رابط الطاولة</a>
                </Button>
                <PermissionGate permission="qr.manage">
                  <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => void downloadQr(table)}><Download className="ml-2 h-4 w-4" />تحميل PNG</Button>
                </PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
        {!tables.length ? <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">لا توجد طاولات مطابقة في الفرع الحالي.</div> : null}
        <p className="mt-4 text-xs text-muted-foreground">كل رمز قابل للمسح ويحتوي حاليًا على معرّفات الكافيه والفرع والطاولة. ستُستبدل المعرّفات العامة برمز موقّع عند ربط Backend.</p>
      </section>
    </AdminShell>
  );
}

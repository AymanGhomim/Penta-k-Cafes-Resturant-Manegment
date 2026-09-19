"use client";
/* eslint-disable @next/next/no-img-element -- Live branding previews intentionally support data/blob URLs. */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";
import {
  TenantDetailHeader,
  TenantTabs,
} from "@/components/platform/tenant-detail-header";
import type { Tenant, TenantBranding } from "@/types/tenant.types";
import { AppNotFoundState } from "@/components/feedback/app-state";
import { BrandAssetUpload } from "@/components/platform/brand-asset-upload";
import { TenantBrandingPreview } from "@/components/features/tenants/tenant-branding-preview";
import {
  normalizeTenantBranding,
  TENANT_FONT_OPTIONS,
} from "@/lib/tenant-branding";

const colorFields: [keyof TenantBranding, string][] = [
  ["primary", "اللون الأساسي"],
  ["primaryForeground", "نص اللون الأساسي"],
  ["secondary", "اللون الثانوي"],
  ["secondaryForeground", "نص اللون الثانوي"],
  ["accent", "لون الإبراز"],
  ["accentForeground", "نص لون الإبراز"],
  ["background", "الخلفية"],
  ["surface", "البطاقات"],
  ["surfaceSecondary", "السطح الثانوي"],
  ["sidebar", "السايدبار"],
  ["sidebarText", "نص السايدبار"],
  ["sidebarActive", "العنصر النشط بالسايدبار"],
  ["sidebarActiveForeground", "نص العنصر النشط"],
  ["textPrimary", "النص الأساسي"],
  ["textSecondary", "النص الثانوي"],
  ["muted", "الخلفية الهادئة"],
  ["border", "الحدود"],
];
export default function TenantBrandingPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    platformTenantsApiService.find(tenantId).then(setTenant).catch(() => setTenant(null)).finally(() => setLoading(false));
  }, [tenantId]);
  if (loading) return <section className="mx-auto max-w-[1500px] p-10 text-sm text-[#667085]">جاري تحميل بيانات الكافيه...</section>;
  if (!tenant)
    return (
      <AppNotFoundState
        variant="platform"
        description="تعذر العثور على الكافيه المطلوب داخل لوحة إدارة المنصة."
        actionHref="/platform/tenants"
        actionLabel="العودة إلى الكافيهات"
      />
    );
  return <BrandingEditor tenant={tenant} />;
}
function BrandingEditor({ tenant }: { tenant: Tenant }) {
  const initialBranding = useMemo(
    () => normalizeTenantBranding(tenant.branding),
    [tenant.branding],
  );
  const [branding, setBranding] = useState<TenantBranding>(
    () => initialBranding,
  );
  const [savedBranding, setSavedBranding] = useState<TenantBranding>(
    () => initialBranding,
  );
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("admin");
  const isDirty = JSON.stringify(branding) !== JSON.stringify(savedBranding);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  const update = (key: keyof TenantBranding, value: string) =>
    setBranding((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const normalized = normalizeTenantBranding(branding);
    setSaving(true);
    try {
      const updated = await platformTenantsApiService.update(tenant.id, { branding: normalized });
      setBranding(normalized);
      setSavedBranding(normalized);
      if (updated) window.dispatchEvent(new Event("tenant:branding-changed"));
      toast.success("تم حفظ التغييرات بنجاح");
    } catch {
      toast.error(
        "تعذر حفظ الهوية في الخادم. تحقق من الاتصال والصلاحيات ثم حاول مرة أخرى.",
      );
    } finally {
      setSaving(false);
    }
  };
  const reset = () => setBranding({ ...savedBranding });
  return (
    <section className="mx-auto max-w-[1500px] p-5 sm:p-10">
      <TenantDetailHeader tenant={{ ...tenant, branding }} />
      <TenantTabs id={tenant.id} active="branding" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_430px]">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2 border-b pb-4">
              {[
                ["identity", "الهوية"],
                ["colors", "الألوان"],
                ["font", "الخط"],
                ["login", "تسجيل الدخول"],
                ["menu", "المنيو الإلكتروني"],
                ["receipt", "الفاتورة"],
                ["qr", "QR"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === key ? "bg-[#111111] text-white" : "text-[#374151] hover:bg-[#F3F4F6]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "identity" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="اسم الكافيه" value={tenant.name} disabled />
                <BrandAssetUpload
                  label="الشعار الرئيسي"
                  kind="logo"
                  value={branding.logo}
                  onChange={(value) => update("logo", value || "")}
                />
                <BrandAssetUpload
                  label="الشعار الفاتح"
                  kind="logo"
                  value={branding.lightLogo || ""}
                  onChange={(value) => update("lightLogo", value || "")}
                />
                <BrandAssetUpload
                  label="الشعار الداكن"
                  kind="logo"
                  value={branding.darkLogo || ""}
                  onChange={(value) => update("darkLogo", value || "")}
                />
                <BrandAssetUpload
                  label="أيقونة الموقع"
                  kind="favicon"
                  value={branding.favicon || ""}
                  onChange={(value) => update("favicon", value || "")}
                />
              </div>
            ) : null}
            {mode === "colors" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {colorFields.map(([key, label]) => (
                  <label key={key} className="text-sm font-bold">
                    {label}
                    <div className="mt-2 flex gap-2">
                      <input
                        type="color"
                        value={String(branding[key])}
                        onChange={(event) => update(key, event.target.value)}
                        className="h-10 w-12 rounded-lg border p-1"
                      />
                      <Input
                        value={String(branding[key])}
                        onChange={(event) => update(key, event.target.value)}
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </label>
                ))}
              </div>
            ) : null}
            {mode === "font" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  الخط
                  <select
                    value={branding.fontFamily || "Cairo"}
                    onChange={(event) =>
                      update("fontFamily", event.target.value)
                    }
                    className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
                  >
                    {TENANT_FONT_OPTIONS.map((font) => (
                      <option key={font}>{font}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="نصف قطر الحواف"
                  value={branding.radius}
                  onChange={(value) => update("radius", value)}
                />
              </div>
            ) : null}
            {mode === "login" ? (
              <div className="mt-6 grid gap-4">
                <BrandAssetUpload
                  label="صورة خلفية تسجيل الدخول"
                  kind="loginBackground"
                  value={branding.login?.backgroundImage}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      login: {
                        ...(current.login || {
                          backgroundColor: current.background,
                          welcomeTitle: "",
                          subtitle: "",
                          cardStyle: "solid",
                        }),
                        backgroundImage: value,
                      },
                    }))
                  }
                />
                <p className="-mt-2 text-xs text-[#667085]">
                  عند حذف الصورة سيتم استخدام لون الخلفية فقط.
                </p>
                <Field
                  label="عنوان الترحيب"
                  value={branding.login?.welcomeTitle || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      login: {
                        ...(current.login || {
                          backgroundColor: current.background,
                          subtitle: "",
                          cardStyle: "solid",
                        }),
                        welcomeTitle: value,
                      },
                    }))
                  }
                />
                <Field
                  label="الوصف"
                  value={branding.login?.subtitle || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      login: {
                        ...(current.login || {
                          backgroundColor: current.background,
                          welcomeTitle: "",
                          cardStyle: "solid",
                        }),
                        subtitle: value,
                      },
                    }))
                  }
                />
                <Field
                  label="لون خلفية الدخول"
                  value={branding.login?.backgroundColor || branding.background}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      login: {
                        ...(current.login || {
                          welcomeTitle: "",
                          subtitle: "",
                          cardStyle: "solid",
                        }),
                        backgroundColor: value,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
            {mode === "menu" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="عنوان الهيدر"
                  value={branding.menu?.headerText || tenant.name}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      menu: {
                        ...(current.menu || { categoryAccent: current.accent }),
                        headerText: value,
                      },
                    }))
                  }
                />
                <Field
                  label="لون أقسام المنيو"
                  value={branding.menu?.categoryAccent || branding.accent}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      menu: {
                        ...(current.menu || { headerText: tenant.name }),
                        categoryAccent: value,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
            {mode === "receipt" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="هاتف الفاتورة"
                  value={branding.receipt?.phone || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      receipt: {
                        ...(current.receipt || { showQr: true }),
                        phone: value,
                      },
                    }))
                  }
                />
                <Field
                  label="العنوان"
                  value={branding.receipt?.address || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      receipt: {
                        ...(current.receipt || { showQr: true }),
                        address: value,
                      },
                    }))
                  }
                />
                <Field
                  label="الرقم الضريبي"
                  value={branding.receipt?.taxNumber || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      receipt: {
                        ...(current.receipt || { showQr: true }),
                        taxNumber: value,
                      },
                    }))
                  }
                />
                <Field
                  label="تذييل الفاتورة"
                  value={branding.receipt?.footer || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      receipt: {
                        ...(current.receipt || { showQr: true }),
                        footer: value,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
            {mode === "qr" ? (
              <div className="mt-6 grid gap-4">
                <Field
                  label="لون QR"
                  value={branding.qr?.foregroundColor || branding.primary}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      qr: {
                        ...(current.qr || {
                          title: "افتح المنيو",
                          helperText: "امسح الكود للطلب",
                        }),
                        foregroundColor: value,
                      },
                    }))
                  }
                />
                <Field
                  label="عنوان البطاقة"
                  value={branding.qr?.title || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      qr: {
                        ...(current.qr || {
                          foregroundColor: current.primary,
                          helperText: "",
                        }),
                        title: value,
                      },
                    }))
                  }
                />
                <Field
                  label="النص المساعد"
                  value={branding.qr?.helperText || ""}
                  onChange={(value) =>
                    setBranding((current) => ({
                      ...current,
                      qr: {
                        ...(current.qr || {
                          foregroundColor: current.primary,
                          title: "افتح المنيو",
                        }),
                        helperText: value,
                      },
                    }))
                  }
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <TenantBrandingPreview
          tenant={tenant}
          branding={branding}
          mode={mode}
        />
        <div className="xl:col-span-2 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={reset}
            disabled={!isDirty || saving}
          >
            <RotateCcw className="ml-2 h-4 w-4" />
            إلغاء التغييرات
          </Button>
          <Button onClick={save} disabled={!isDirty || saving}>
            <Save className="ml-2 h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </div>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <Input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2"
      />
    </label>
  );
}

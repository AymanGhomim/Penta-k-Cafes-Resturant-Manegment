"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TenantBrandingStep } from "@/components/features/tenants/tenant-branding-step";
import { TenantDetailsStep } from "@/components/features/tenants/tenant-details-step";
import { TenantFormNavigation } from "@/components/features/tenants/tenant-form-navigation";
import {
  baseTenantBranding,
  slugifyTenant,
  tenantFeatureKeys,
  type TenantDraft,
} from "@/components/features/tenants/tenant-form-model";
import { TenantOwnerStep } from "@/components/features/tenants/tenant-owner-step";
import { TenantPlanStep } from "@/components/features/tenants/tenant-plan-step";
import { TenantReviewStep } from "@/components/features/tenants/tenant-review-step";
import { TenantSubscriptionStep } from "@/components/features/tenants/tenant-subscription-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getEffectiveFeatures,
  getPlanByCode,
  getPlans,
  normalizePlanCode,
} from "@/config/plans.config";
import { normalizeTenantBranding } from "@/lib/tenant-branding";
import { credentialService } from "@/services/credential.service";
import type { FeatureKey } from "@/types/platform.types";
import type { Tenant, TenantBranding } from "@/types/tenant.types";
import { platformTenantsApiService } from "@/services/platform-tenants-api.service";

const steps = [
  "بيانات الكافيه",
  "حساب المسؤول",
  "الهوية",
  "الباقة",
  "الاشتراك",
  "المراجعة",
];

export function TenantForm({ tenant }: { tenant?: Tenant }) {
  const router = useRouter();
  const existingOwner = tenant
    ? credentialService.getOwner(tenant.id)
    : undefined;
  const [step, setStep] = useState(0);
  const [remoteTenants, setRemoteTenants] = useState<{ id: string; slug: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<TenantDraft>(() => {
    const plan = normalizePlanCode(
      tenant?.plan ?? getPlans().find((item) => item.active)?.code ?? "BASIC",
    );
    const hasCustomFeatures = Boolean(
      tenant?.featureOverrides &&
        Object.keys(tenant.featureOverrides).length > 0,
    );
    const effectiveFeatures = getEffectiveFeatures(
      plan,
      hasCustomFeatures ? tenant?.featureOverrides : undefined,
    );
    return {
      name: tenant?.name || "",
      slug: tenant?.slug || "",
      phone: tenant?.contact?.phone || "",
      whatsapp: tenant?.contact?.whatsapp || "",
      email: tenant?.contact?.email || "",
      address: tenant?.contact?.address || "",
      locationUrl: tenant?.contact?.locationUrl || "",
      facebook: tenant?.contact?.facebook || "",
      instagram: tenant?.contact?.instagram || "",
      tiktok: tenant?.contact?.tiktok || "",
      ownerName: tenant?.owner?.name || "",
      ownerEmail: tenant?.owner?.email || "",
      ownerPhone: tenant?.owner?.phone || "",
      ownerUsername: existingOwner
        ? credentialService.getLogin(existingOwner)
        : "",
      ownerPassword: "",
      ownerPasswordConfirm: "",
      logo: tenant?.branding.logo || baseTenantBranding.logo,
      branding: { ...baseTenantBranding, ...tenant?.branding },
      plan,
      featureSelectionMode: hasCustomFeatures ? "CUSTOM" : "PLAN",
      enabledFeatures: tenantFeatureKeys.filter(
        (key) => effectiveFeatures[key],
      ),
      subscriptionType: tenant?.subscription?.type || "TRIAL",
      startsAt:
        tenant?.subscription?.startsAt?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      endsAt:
        tenant?.subscription?.endsAt?.slice(0, 10) ||
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: tenant?.status || "TRIAL",
      adminClientMode: tenant?.adminClientMode ?? "WEB",
    };
  });

  useEffect(() => {
    if (!draft.slug && draft.name)
      setDraft((current) => ({
        ...current,
        slug: slugifyTenant(current.name),
      }));
  }, [draft.name, draft.slug]);
  useEffect(() => {
    void platformTenantsApiService.list()
      .then((tenants) => setRemoteTenants(tenants.map((item) => ({ id: item.id, slug: item.slug }))))
      .catch(() => setRemoteTenants([]));
  }, []);
  const duplicate = useMemo(
    () => remoteTenants.some((item) => item.slug === draft.slug && item.id !== tenant?.id),
    [draft.slug, remoteTenants, tenant?.id],
  );
  const update = <K extends keyof TenantDraft>(key: K, value: TenantDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const updateBranding = (key: keyof TenantBranding, value: string) =>
    setDraft((current) => ({
      ...current,
      branding: { ...current.branding, [key]: value },
    }));

  async function save() {
    if (!draft.name.trim() || !/^[a-z0-9-]+$/.test(draft.slug) || duplicate)
      return void toast.error(
        "راجع اسم الكافيه والـ المعرّف المختصر قبل الحفظ",
      );
    if (!draft.ownerName.trim() || !draft.ownerUsername.trim()) {
      toast.error("اسم المسؤول واسم المستخدم مطلوبان.");
      setStep(1);
      return;
    }
    if (!tenant && draft.ownerPassword.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف.");
      setStep(1);
      return;
    }
    if (draft.ownerPassword && draft.ownerPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.");
      setStep(1);
      return;
    }
    if (draft.ownerPassword !== draft.ownerPasswordConfirm) {
      toast.error("كلمتا المرور غير متطابقتين.");
      setStep(1);
      return;
    }
    const plan = getPlanByCode(draft.plan);
    const featureOverrides =
      draft.featureSelectionMode === "CUSTOM"
        ? (Object.fromEntries(
            tenantFeatureKeys.map((key) => [
              key,
              draft.enabledFeatures.includes(key),
            ]),
          ) as Partial<Record<FeatureKey, boolean>>)
        : {};
    const payload: Tenant = {
      id: tenant?.id || `tenant-${draft.slug}-${Date.now()}`,
      slug: draft.slug,
      name: draft.name.trim(),
      status: draft.status,
      plan: draft.plan,
      subscriptionStatus:
        draft.status === "SUSPENDED"
          ? "CANCELED"
          : draft.subscriptionType === "TRIAL"
            ? "TRIALING"
            : "ACTIVE",
      adminClientMode: draft.adminClientMode,
      branding: normalizeTenantBranding({
        ...draft.branding,
        logo: draft.logo || draft.branding.logo,
      }),
      settings: {
        currency: "EGP",
        currencySymbol: "ج.م",
        timezone: "Africa/Cairo",
        locale: "ar",
        taxRate: 14,
      },
      features: getEffectiveFeatures(plan.code, featureOverrides),
      featureOverrides,
      createdAt: tenant?.createdAt || new Date().toISOString(),
      contact: {
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        email: draft.email,
        address: draft.address,
        locationUrl: draft.locationUrl,
        facebook: draft.facebook,
        instagram: draft.instagram,
        tiktok: draft.tiktok,
      },
      owner: {
        name: draft.ownerName,
        email: draft.ownerEmail,
        phone: draft.ownerPhone,
      },
      subscription: {
        type: draft.subscriptionType,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
      },
    };
    try {
      const remoteTenant = tenant
        ? await platformTenantsApiService.update(tenant.id, {
            ...payload,
            ownerPassword: draft.ownerPassword || undefined,
            ownerUsername: draft.ownerUsername,
          })
        : await platformTenantsApiService.create({
            ...payload,
            ownerPassword: draft.ownerPassword,
            ownerUsername: draft.ownerUsername,
          });
      await credentialService.provisionOwner(payload.id, {
        name: draft.ownerName,
        email: draft.ownerEmail,
        phone: draft.ownerPhone,
        username: draft.ownerUsername,
        password: draft.ownerPassword || undefined,
      });
      setSubmitted(true);
      toast.success(
        tenant
          ? draft.ownerPassword
            ? "تم تحديث الكافيه وإعادة تعيين كلمة مرور المسؤول"
            : "تم تحديث بيانات الكافيه"
          : "تم إنشاء الكافيه وحساب المسؤول",
      );
      router.replace(`/platform/tenants/${remoteTenant.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ بيانات الكافيه.",
      );
    }
  }

  return (
    <section className="mx-auto max-w-[1500px] p-5 sm:p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#374151]">إدارة الكافيهات</p>
          <h1 className="mt-2 text-3xl font-black">
            {tenant ? "تعديل الكافيه" : "إضافة كافيه"}
          </h1>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          إلغاء
        </Button>
      </div>
      <div className="mb-6 grid gap-2 sm:grid-cols-6">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-xl border px-3 py-3 text-xs font-bold ${step === index ? "border-[#111111] bg-[#111111] text-white" : "border-[#D1D5DB] bg-white text-[#374151]"}`}
          >
            <span className="mb-1 block text-[10px] opacity-70">
              {index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-5 sm:p-8">
          {step === 0 ? (
            <TenantDetailsStep
              draft={draft}
              duplicate={duplicate}
              editing={Boolean(tenant)}
              update={update}
            />
          ) : null}
          {step === 1 ? (
            <TenantOwnerStep
              draft={draft}
              editing={Boolean(tenant)}
              update={update}
            />
          ) : null}
          {step === 2 ? (
            <TenantBrandingStep
              draft={draft}
              update={update}
              onBrandingChange={updateBranding}
            />
          ) : null}
          {step === 3 ? (
            <TenantPlanStep draft={draft} setDraft={setDraft} update={update} />
          ) : null}
          {step === 4 ? (
            <TenantSubscriptionStep draft={draft} update={update} />
          ) : null}
          {step === 5 ? <TenantReviewStep draft={draft} /> : null}
          <TenantFormNavigation
            step={step}
            lastStep={steps.length - 1}
            submitted={submitted}
            editing={Boolean(tenant)}
            onPrevious={() => setStep((value) => value - 1)}
            onNext={() => setStep((value) => value + 1)}
            onSave={save}
          />
        </CardContent>
      </Card>
    </section>
  );
}

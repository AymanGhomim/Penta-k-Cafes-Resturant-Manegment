"use client";

import { useEffect, useState } from "react";
import { KeyRound, Percent, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminLocale } from "@/providers/admin-locale-provider";
import { useSettingsStore } from "@/store/settings.store";
import { useTenant } from "@/providers/tenant-provider";
import { useCurrentEmployee } from "@/providers/current-employee-provider";
import { employeeApiService } from "@/services/employee-api.service";
import { cafeTenantApiService } from "@/services/cafe-tenant-api.service";

const emptyContact = {
  phone: "",
  whatsapp: "",
  address: "",
  locationUrl: "",
  facebook: "",
  instagram: "",
  tiktok: "",
};

function normalizeWebUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const copy = {
  en: {
    eyebrow: "Cafe management",
    title: "Settings",
    description: "Control dashboard preferences and workspace behavior.",
    serviceTax: "Service tax",
    serviceTaxText: "Set the service percentage added to customer cart totals.",
    serviceTaxLabel: "Service percentage",
    serviceTaxHint: "Applied automatically in cart totals.",
    language: "Language",
    languageText: "Choose the display language for the admin dashboard.",
    english: "English",
    arabic: "Arabic",
    workspace: "Workspace",
    workspaceText: "Admin access and workspace data are ready.",
    active: "Active",
  },
  ar: {
    eyebrow: "إدارة الكافيه",
    title: "الإعدادات",
    description: "تحكم في تفضيلات لوحة الإدارة وطريقة عملها.",
    serviceTax: "ضريبة الخدمة",
    serviceTaxText: "حدد نسبة الخدمة المضافة على إجمالي سلة العميل.",
    serviceTaxLabel: "نسبة الخدمة",
    serviceTaxHint: "تطبق تلقائيا داخل إجمالي الكارت.",
    language: "اللغة",
    languageText: "اختر لغة عرض لوحة الإدارة.",
    english: "English",
    arabic: "العربية",
    workspace: "مساحة العمل",
    workspaceText: "صلاحيات الإدارة وبيانات مساحة العمل جاهزة.",
    active: "نشط",
  },
} as const;

export default function SettingsPage() {
  const { locale } = useAdminLocale();
  const { tenant } = useTenant();
  const { employee, hasPermission } = useCurrentEmployee();
  const canEdit = hasPermission("settings.edit");
  const serviceTaxPercent = useSettingsStore(
    (state) => state.serviceTaxPercent,
  );
  const setServiceTaxPercent = useSettingsStore(
    (state) => state.setServiceTaxPercent,
  );
  const [taxInput, setTaxInput] = useState("0");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [contact, setContact] = useState(emptyContact);
  const [profileName, setProfileName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const text = copy[locale];

  useEffect(() => {
    useSettingsStore.getState().loadForTenant();
  }, []);

  useEffect(() => {
    setTaxInput(String(serviceTaxPercent));
  }, [serviceTaxPercent]);

  useEffect(() => {
    let cancelled = false;
    void cafeTenantApiService.get().then((remoteTenant) => {
      if (cancelled) return;
      setProfileName(remoteTenant.name);
      setLegalName(remoteTenant.legalName ?? "");
      setContact({
        phone: remoteTenant.contact?.phone ?? "",
        whatsapp: remoteTenant.contact?.whatsapp ?? "",
        address: remoteTenant.contact?.address ?? "",
        locationUrl: remoteTenant.contact?.locationUrl ?? "",
        facebook: remoteTenant.contact?.facebook ?? "",
        instagram: remoteTenant.contact?.instagram ?? "",
        tiktok: remoteTenant.contact?.tiktok ?? "",
      });
      const remoteTax = remoteTenant.settings?.taxRate;
      if (typeof remoteTax === "number") {
        setTaxInput(String(remoteTax));
        setServiceTaxPercent(remoteTax);
      }
    }).catch(() => {
      if (!cancelled) toast.error(locale === "ar" ? "تعذر تحميل إعدادات الكافيه من الخادم." : "Could not load cafe settings.");
    }).finally(() => {
      if (!cancelled) setIsLoadingProfile(false);
    });
    return () => { cancelled = true; };
  }, [locale, setServiceTaxPercent]);

  function handleTaxChange(value: string) {
    if (!canEdit) return;
    setTaxInput(value);
    const nextValue = Number(value);

    if (!Number.isNaN(nextValue)) {
      setServiceTaxPercent(nextValue);
    }
  }

  async function handlePasswordChange() {
    if (!employee || isChangingPassword) return;
    if (newPassword.length < 6) {
      toast.error(locale === "ar" ? "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف." : "The new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(locale === "ar" ? "كلمتا المرور الجديدتان غير متطابقتين." : "The new passwords do not match.");
      return;
    }
    try {
      setIsChangingPassword(true);
      void currentPassword;
      await employeeApiService.update(employee.id, { password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(locale === "ar" ? "تم تغيير كلمة المرور بنجاح." : "Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تغيير كلمة المرور.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function saveContact() {
    if (!canEdit || isSavingProfile) return;
    try {
      setIsSavingProfile(true);
      await cafeTenantApiService.update({
        name: profileName.trim(),
        legalName: legalName.trim() || undefined,
        contact: {
          phone: contact.phone.trim(),
          whatsapp: contact.whatsapp.trim(),
          address: contact.address.trim(),
          locationUrl: normalizeWebUrl(contact.locationUrl),
          facebook: normalizeWebUrl(contact.facebook),
          instagram: normalizeWebUrl(contact.instagram),
          tiktok: normalizeWebUrl(contact.tiktok),
        },
        settings: { taxRate: serviceTaxPercent },
      });
      toast.success(locale === "ar" ? "تم حفظ إعدادات الكافيه على الخادم." : "Cafe settings saved to the server.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ إعدادات الكافيه.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <AdminShell>
      <section className="animate-content-enter mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-md border bg-card shadow-sm">
          <div className="relative p-6 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              {locale === "ar"
                ? `إدارة ${tenant.name}`
                : `${tenant.name} management`}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {text.title}
            </h1>
            <p className="mt-2 max-w-xl leading-7 text-muted-foreground">
              {text.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <SettingsCard
            icon={Share2}
            title="بيانات التواصل والسوشيال ميديا"
            description="تظهر هذه البيانات مع العنوان ورقم الهاتف داخل منيو العملاء."
            action={
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[720px]">
                <ContactField label="اسم الكافيه" value={profileName} disabled={!canEdit} onChange={setProfileName} />
                <ContactField label="الاسم القانوني" value={legalName} disabled={!canEdit} onChange={setLegalName} />
                <ContactField label="رقم الهاتف" value={contact.phone} disabled={!canEdit} onChange={(phone) => setContact((current) => ({ ...current, phone }))} />
                <ContactField label="WhatsApp" value={contact.whatsapp} disabled={!canEdit} onChange={(whatsapp) => setContact((current) => ({ ...current, whatsapp }))} />
                <div className="sm:col-span-2"><ContactField label="العنوان" value={contact.address} disabled={!canEdit} onChange={(address) => setContact((current) => ({ ...current, address }))} /></div>
                <div className="sm:col-span-2"><ContactField label="رابط الموقع على الخريطة" value={contact.locationUrl} disabled={!canEdit} placeholder="https://maps.google.com/..." onChange={(locationUrl) => setContact((current) => ({ ...current, locationUrl }))} /></div>
                <ContactField label="Facebook" value={contact.facebook} disabled={!canEdit} placeholder="https://facebook.com/..." onChange={(facebook) => setContact((current) => ({ ...current, facebook }))} />
                <ContactField label="Instagram" value={contact.instagram} disabled={!canEdit} placeholder="https://instagram.com/..." onChange={(instagram) => setContact((current) => ({ ...current, instagram }))} />
                <ContactField label="TikTok" value={contact.tiktok} disabled={!canEdit} placeholder="https://tiktok.com/@..." onChange={(tiktok) => setContact((current) => ({ ...current, tiktok }))} />
                <Button type="button" disabled={!canEdit || isLoadingProfile || isSavingProfile} onClick={saveContact} className="sm:self-end">
                  {isSavingProfile ? "جارٍ الحفظ..." : "حفظ بيانات التواصل"}
                </Button>
              </div>
            }
          />
          <SettingsCard
            icon={Percent}
            title={text.serviceTax}
            description={text.serviceTaxText}
            action={
              <div className="w-full space-y-2 sm:w-72">
                <Label
                  htmlFor="service-tax"
                  className="text-xs font-bold text-muted-foreground"
                >
                  {text.serviceTaxLabel}
                </Label>
                <div className="relative">
                  <Input
                    id="service-tax"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={taxInput}
                    disabled={!canEdit}
                    onChange={(event) => handleTaxChange(event.target.value)}
                    className="h-11 rounded-md pe-12 text-base font-black"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm font-black text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {canEdit ? text.serviceTaxHint : "لديك صلاحية عرض الإعدادات فقط."}
                </p>
              </div>
            }
          />
          <SettingsCard
            icon={ShieldCheck}
            title={text.workspace}
            description={text.workspaceText}
            action={
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-700">
                {text.active}
              </span>
            }
          />
          <SettingsCard
            icon={KeyRound}
            title={locale === "ar" ? "تغيير كلمة المرور" : "Change password"}
            description={locale === "ar" ? "أدخل كلمة المرور الحالية أولًا لحماية حسابك." : "Enter your current password first to protect your account."}
            action={
              <div className="grid w-full gap-3 sm:w-[420px]">
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder={locale === "ar" ? "كلمة المرور الحالية" : "Current password"}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={locale === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  disabled={!employee || !currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                  onClick={handlePasswordChange}
                >
                  {isChangingPassword
                    ? locale === "ar" ? "جارٍ التغيير..." : "Changing..."
                    : locale === "ar" ? "تغيير كلمة المرور" : "Change password"}
                </Button>
              </div>
            }
          />
        </div>
      </section>
    </AdminShell>
  );
}

function ContactField({ label, value, disabled, placeholder, onChange }: { label: string; value: string; disabled: boolean; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <Label className="text-xs font-bold text-muted-foreground">
      {label}
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 text-foreground"
        dir="ltr"
      />
    </Label>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="rounded-md">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

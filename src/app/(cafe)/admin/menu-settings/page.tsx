"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Globe2, MapPin, Save, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionGate } from "@/components/access/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { customerMenuSettingsApiService, defaultCustomerMenuSettings } from "@/services/customer-menu-settings-api.service";
import type { CustomerMenuSettings } from "@/types/customer-menu-settings.types";

const tabs = [["general", "عام", Globe2], ["dinein", "داخل الكافيه", MapPin], ["takeaway", "تيك أواي", ShoppingBag], ["delivery", "التوصيل", MapPin], ["payments", "الدفع", CreditCard]] as const;
type Tab = (typeof tabs)[number][0];

export default function MenuSettingsPage() {
  const initial = defaultCustomerMenuSettings();
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<CustomerMenuSettings>(initial);
  const [saved, setSaved] = useState<CustomerMenuSettings>(initial);
  const reload = () => { void customerMenuSettingsApiService.get().then((value) => { setSettings(value); setSaved(value); }).catch(() => undefined); };
  useEffect(() => {
    window.addEventListener("tenant:changed", reload);
    return () => window.removeEventListener("tenant:changed", reload);
  }, []);
  const toggle = (key: keyof CustomerMenuSettings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const number = (key: "preparationMinutes" | "minimumDeliveryOrder" | "estimatedDeliveryMinutes", value: string) => setSettings((current) => ({ ...current, [key]: Number(value) }));
  const save = async () => {
    try { const value = await customerMenuSettingsApiService.save(settings); setSettings(value); setSaved(value); toast.success("تم حفظ إعدادات المنيو."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ الإعدادات."); }
  };
  return (
    <AdminShell>
      <section dir="rtl" className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold text-accent">المنيو الإلكتروني</p><h1 className="mt-1 text-2xl font-black">إعدادات المنيو الإلكتروني</h1><p className="mt-1 text-sm text-muted-foreground">تحكم في قنوات الطلب والدفع والتوصيل.</p></div>
          <PermissionGate permission="menus.manage"><div className="flex gap-2"><Button variant="outline" onClick={() => setSettings(saved)}>إلغاء التغييرات</Button><Button onClick={save}><Save className="ml-2 h-4 w-4" />حفظ التغييرات</Button></div></PermissionGate>
        </div>
        <Card className="overflow-hidden rounded-xl"><CardContent className="p-0">
          <div className="flex gap-1 overflow-x-auto border-b p-3">{tabs.map(([value, label, Icon]) => <button type="button" key={value} onClick={() => setTab(value)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
          <div className="grid gap-3 p-5">
            {tab === "general" ? <><SettingRow title="تفعيل الطلب الإلكتروني" checked={settings.onlineOrderingEnabled} onChange={() => toggle("onlineOrderingEnabled")} /><SettingRow title="المنيو مفتوح" checked={settings.menuOpen} onChange={() => toggle("menuOpen")} /><SettingRow title="قبول الطلبات تلقائيًا" checked={settings.autoAcceptOrders} onChange={() => toggle("autoAcceptOrders")} /></> : null}
            {tab === "dinein" ? <><SettingRow title="تفعيل QR" checked={settings.qrEnabled} onChange={() => toggle("qrEnabled")} /><SettingRow title="السماح بأكثر من طلب للطاولة" checked={settings.multipleTableOrders} onChange={() => toggle("multipleTableOrders")} /><SettingRow title="طلب ويتر" checked={settings.waiterRequestsEnabled} onChange={() => toggle("waiterRequestsEnabled")} /><SettingRow title="طلب الحساب" checked={settings.billRequestsEnabled} onChange={() => toggle("billRequestsEnabled")} /><SettingRow title="الدفع عند الكاشير" checked={settings.payAtCashierEnabled} onChange={() => toggle("payAtCashierEnabled")} /><SettingRow title="الدفع الإلكتروني داخل الكافيه" checked={settings.electronicDineInPaymentEnabled} onChange={() => toggle("electronicDineInPaymentEnabled")} /></> : null}
            {tab === "takeaway" ? <><SettingRow title="تفعيل تيك أواي" checked={settings.takeawayEnabled} onChange={() => toggle("takeawayEnabled")} /><SettingRow title="الاستلام الآن" checked={settings.asapPickupEnabled} onChange={() => toggle("asapPickupEnabled")} /><SettingRow title="استلام مجدول" checked={settings.scheduledPickupEnabled} onChange={() => toggle("scheduledPickupEnabled")} /><NumberField title="مدة التحضير بالدقائق" value={settings.preparationMinutes} onChange={(value) => number("preparationMinutes", value)} /></> : null}
            {tab === "delivery" ? <><SettingRow title="تفعيل التوصيل" checked={settings.deliveryEnabled} onChange={() => toggle("deliveryEnabled")} /><div className="grid max-w-xl gap-3 sm:grid-cols-2"><NumberField title="الحد الأدنى للطلب" value={settings.minimumDeliveryOrder} onChange={(value) => number("minimumDeliveryOrder", value)} /><NumberField title="وقت التوصيل المتوقع" value={settings.estimatedDeliveryMinutes} onChange={(value) => number("estimatedDeliveryMinutes", value)} /></div><Button asChild variant="outline" className="w-fit"><Link href="/admin/delivery-zones">إدارة مناطق التوصيل</Link></Button></> : null}
            {tab === "payments" ? <><SettingRow title="نقدي" checked={settings.cashEnabled} onChange={() => toggle("cashEnabled")} /><SettingRow title="بطاقة" checked={settings.cardEnabled} onChange={() => toggle("cardEnabled")} /><SettingRow title="محفظة" checked={settings.walletEnabled} onChange={() => toggle("walletEnabled")} /><SettingRow title="دفع إلكتروني" checked={settings.onlinePaymentEnabled} onChange={() => toggle("onlinePaymentEnabled")} /></> : null}
          </div>
        </CardContent></Card>
      </section>
    </AdminShell>
  );
}

function SettingRow({ title, checked, onChange }: { title: string; checked: boolean; onChange: () => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border p-4"><p className="text-sm font-bold">{title}</p><Switch checked={checked} onCheckedChange={onChange} aria-label={title} /></div>; }
function NumberField({ title, value, onChange }: { title: string; value: number; onChange: (value: string) => void }) { return <label className="block max-w-sm text-sm font-semibold">{title}<Input value={value} onChange={(event) => onChange(event.target.value)} min={0} type="number" className="mt-1 h-10 rounded-lg" /></label>; }

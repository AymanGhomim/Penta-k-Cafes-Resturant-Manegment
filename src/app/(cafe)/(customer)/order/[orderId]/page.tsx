"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useCustomerRoute } from "@/providers/customer-route-provider";
import { publicMenuApiService } from "@/services/public-menu-api.service";
import type { Order } from "@/types/order.types";

const statusLabels: Record<string, string> = { NEW: "جديد", ACCEPTED: "مقبول", PREPARING: "جاري التحضير", READY: "جاهز", COMPLETED: "مكتمل", CANCELLED: "ملغي", REFUNDED: "مسترجع", PENDING: "في انتظار الدفع", PAID: "مدفوع" };
const typeLabels: Record<string, string> = { TABLE: "داخل الكافيه", TAKEAWAY: "تيك أواي", DELIVERY: "توصيل" };

export default function CustomerOrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const customerRoute = useCustomerRoute();
  const context = customerRoute.context;
  const [order, setOrder] = useState<Order | null | undefined>();

  useEffect(() => {
    if (!context) return setOrder(null);
    setOrder(undefined);
    void publicMenuApiService.getOrder(context.tenant.id, orderId).then(setOrder).catch(() => setOrder(null));
  }, [context, orderId]);

  if (order === undefined) return <main className="flex min-h-screen items-center justify-center bg-background"><span className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" /></main>;
  if (!order || !context) return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><h1 className="text-xl font-black">الطلب غير متاح</h1><p className="mt-2 text-sm text-muted-foreground">تعذر العثور على الطلب داخل الكافيه والفرع الحاليين.</p><Button asChild className="mt-5"><Link href={customerRoute.href("/menu")}>العودة إلى المنيو</Link></Button></CardContent></Card></main>;

  return <main dir="rtl" className="min-h-screen bg-background px-4 py-8 text-foreground"><section className="mx-auto max-w-2xl"><div className="mb-6 flex flex-col items-center text-center"><AppLogo /><CheckCircle2 className="mt-5 h-12 w-12 text-emerald-600" /><h1 className="mt-3 text-2xl font-black">تم استلام طلبك</h1><p className="mt-1 text-sm text-muted-foreground">تابع الحالة الحالية من الخادم.</p></div><Card><CardContent className="space-y-6 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5"><div><p className="text-xs text-muted-foreground">رقم الطلب</p><p className="text-xl font-black">{order.orderNumber}</p></div><Badge>{statusLabels[order.status] ?? order.status}</Badge></div><div className="grid gap-4 text-sm sm:grid-cols-2"><Info label="الفرع" value={context.branch.name} /><Info label="نوع الطلب" value={typeLabels[order.orderType] ?? order.orderType} />{order.tableId ? <Info label="الطاولة" value={String(order.tableNumber)} /> : null}<Info label="وقت الطلب" value={formatDateTime(order.createdAt)} /><Info label="طريقة الدفع" value="نقدي عند الكاشير أو الاستلام" /><Info label="حالة الدفع" value={statusLabels[order.paymentStatus ?? "PENDING"] ?? "في انتظار الدفع"} /></div><div><h2 className="mb-3 font-black">المنتجات</h2><div className="divide-y rounded-xl border">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 p-4"><div><p className="font-bold">{item.productName} × {item.quantity}</p>{item.selectedModifiers?.length ? <p className="mt-1 text-xs text-muted-foreground">{item.selectedModifiers.map((modifier) => `${modifier.groupName}: ${modifier.optionName}`).join(" · ")}</p> : null}{item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}</div><span className="shrink-0 font-bold">{formatCurrency(item.totalPrice, context.tenant.settings.currency)}</span></div>)}</div></div><div className="flex items-center justify-between border-t pt-5 text-lg font-black"><span>الإجمالي</span><span>{formatCurrency(order.total, context.tenant.settings.currency)}</span></div><div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />يتم تحديث حالة الطلب من الخادم عند فتح الصفحة.</div><Button asChild className="w-full"><Link href={customerRoute.href("/menu")}>العودة إلى المنيو</Link></Button></CardContent></Card></section></main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }

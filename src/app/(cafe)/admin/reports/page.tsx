"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReportMetricGrid as MetricGrid, ReportTable } from "@/components/features/reports/report-data-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/money";
import { useBranch } from "@/providers/branch-provider";
import { useTenant } from "@/providers/tenant-provider";
import type { ReportFilters } from "@/types/report.types";
import { reportApiService, type RemoteReport } from "@/services/report-api.service";
import type {
  OrderSource,
  OrderType,
  PaymentMethod,
} from "@/types/order.types";
const methodLabels = {
  CASH: "نقدي",
  CARD: "بطاقة",
  WALLET: "محفظة",
  ONLINE: "إلكتروني",
  MIXED: "مختلط",
};
export default function ReportsPage() {
  const { tenant } = useTenant();
  const { branch } = useBranch();
  const [revision, setRevision] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState(branch?.id ?? "");
  const [orderType, setOrderType] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [remote, setRemote] = useState<RemoteReport | null>(null);
  useEffect(() => {
    const reset = () => {
      setRevision((v) => v + 1);
      setBranchId(branch?.id ?? "");
      setFrom("");
      setTo("");
    };
    window.addEventListener("operations:changed", reset);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("operations:changed", reset);
      window.removeEventListener("branch:changed", reset);
    };
  }, [branch?.id]);
  void revision;
  const accessible = branch ? [branch] : [];
  const filters: ReportFilters = {
    allowedBranchIds: accessible.map((branch) => branch.id),
    from: from || undefined,
    to: to || undefined,
    branchIds:
      branchId === "ALL"
        ? accessible.map((b) => b.id)
        : [branchId || branch?.id || ""].filter(Boolean),
    orderType: orderType === "ALL" ? undefined : (orderType as OrderType),
    orderSource: source === "ALL" ? undefined : (source as OrderSource),
    paymentMethod:
      paymentMethod === "ALL" ? undefined : (paymentMethod as PaymentMethod),
  };
  useEffect(() => {
    let active = true;
    void reportApiService.summary(filters).then((data) => { if (active) setRemote(data); }).catch(() => { if (active) setRemote(null); });
    return () => { active = false; };
  }, [branchId, from, to, orderType, source, paymentMethod]);
  const remoteSales = remote?.sales ?? { grossSales: 0, discounts: 0, refunds: 0, netSales: 0, taxes: 0, serviceCharges: 0, deliveryFees: 0, orderCount: 0, averageOrder: 0, orders: [] };
  const remoteProducts = remote?.products ?? [];
  const remoteBreakdown = remote?.breakdown ?? { byType: [], bySource: [] };
  const remotePayments = remote?.payments ?? [];
  const profit = remote?.profit ?? { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 };
  const inventory = remote?.inventory ?? { value: 0, lowStock: 0, outOfStock: 0, purchases: 0, waste: 0, saleConsumption: 0, adjustments: 0 };
  const money = (v: number) => formatMoney(v, tenant.settings.currencySymbol);
  function exportCsv() {
    try {
      const rows = remoteSales.orders.map((o) => ({
        orderNumber: o.orderNumber,
        date: o.createdAt,
        branch: o.branchId,
        type: o.orderType,
        source: o.source,
        payment: o.paymentMethod,
        total: o.total,
        status: o.status,
      }));
      const csv = toCsv(rows);
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التصدير.");
    }
  }
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-accent">الإدارة</p>
            <h1 className="text-2xl font-black">التقارير</h1>
            <p className="text-sm text-muted-foreground">
              تقارير مشتقة مباشرة من الطلبات والعمليات المتاحة للفروع المصرح
              بها.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!remoteSales.orders.length}
            onClick={exportCsv}
          >
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
        <Card className="mb-4">
          <CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <select
              className="rounded border bg-background px-3"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {accessible.length > 1 ? (
                <option value="ALL">كل الفروع المصرح بها</option>
              ) : null}
              {accessible.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border bg-background px-3"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="ALL">كل أنواع الطلب</option>
              <option value="TABLE">داخل الكافيه</option>
              <option value="TAKEAWAY">تيك أواي</option>
              <option value="DELIVERY">توصيل</option>
            </select>
            <select
              className="rounded border bg-background px-3"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="ALL">كل المصادر</option>
              <option value="POS">POS</option>
              <option value="QR_MENU">QR</option>
              <option value="ONLINE_MENU">المنيو الإلكتروني</option>
              <option value="MANUAL">يدوي</option>
            </select>
            <select
              className="rounded border bg-background px-3"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="ALL">كل طرق الدفع</option>
              {Object.entries(methodLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
        <Tabs defaultValue="sales">
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="sales">المبيعات</TabsTrigger>
            <TabsTrigger value="profit">الأرباح</TabsTrigger>
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="payments">الدفع</TabsTrigger>
            <TabsTrigger value="inventory">المخزون</TabsTrigger>
            <TabsTrigger value="employees">الموظفون</TabsTrigger>
          </TabsList>
          <TabsContent value="sales">
            <MetricGrid
              values={[
                ["إجمالي المبيعات", money(remoteSales.grossSales)],
                ["الخصومات", money(remoteSales.discounts)],
                ["الاسترجاعات", money(remoteSales.refunds)],
                ["صافي المبيعات", money(remoteSales.netSales)],
                ["الضرائب", money(remoteSales.taxes)],
                ["رسوم الخدمة", money(remoteSales.serviceCharges)],
                ["رسوم التوصيل", money(remoteSales.deliveryFees)],
                ["عدد الطلبات", String(remoteSales.orderCount)],
                ["متوسط الطلب", money(remoteSales.averageOrder)],
              ]}
            />
          </TabsContent>
          <TabsContent value="profit">
            <MetricGrid
              values={[
                ["الإيراد", money(profit.revenue)],
                ["تكلفة البضاعة التقديرية", money(profit.cogs)],
                ["مجمل الربح التقديري", money(profit.grossProfit)],
                ["المصروفات", money(profit.expenses)],
                ["صافي الربح التقديري", money(profit.netProfit)],
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              القيم تقديرية اعتمادًا على الوصفات ومتوسط تكلفة المخزون، وليست
              قوائم محاسبية نهائية.
            </p>
          </TabsContent>
          <TabsContent value="products">
            <ReportTable
              headers={["المنتج", "الكمية المباعة", "الإيراد"]}
              rows={remoteProducts.map((p) => [
                p.name,
                String(p.quantity),
                money(p.revenue),
              ])}
            />
          </TabsContent>
          <TabsContent value="orders">
            <div className="grid gap-4 xl:grid-cols-2">
              <ReportTable
                headers={["نوع الطلب", "العدد"]}
                rows={remoteBreakdown.byType.map((r) => [r.value, String(r.count)])}
              />
              <ReportTable
                headers={["مصدر الطلب", "العدد"]}
                rows={remoteBreakdown.bySource.map((r) => [r.value, String(r.count)])}
              />
            </div>
          </TabsContent>
          <TabsContent value="payments">
            <ReportTable
              headers={["طريقة الدفع", "المبلغ", "العدد", "النسبة"]}
              rows={remotePayments.map((p) => [
                methodLabels[p.method as keyof typeof methodLabels],
                money(p.amount),
                String(p.count),
                `${p.percentage}%`,
              ])}
            />
          </TabsContent>
          <TabsContent value="inventory">
            <MetricGrid
              values={[
                ["قيمة المخزون", money(inventory.value)],
                ["منخفض المخزون", String(inventory.lowStock)],
                ["نفد المخزون", String(inventory.outOfStock)],
                ["المشتريات", String(inventory.purchases)],
                ["الهالك", money(inventory.waste)],
                ["استهلاك المبيعات", String(inventory.saleConsumption)],
                ["التسويات", String(inventory.adjustments)],
              ]}
            />
          </TabsContent>
          <TabsContent value="employees">
            <ReportTable headers={["الموظف", "المعرف"]} rows={(remote?.employees ?? []).map((employee) => [employee.name, employee.id])} />
          </TabsContent>
        </Tabs>
        {!remoteSales.orders.length ? (
          <div className="mt-4 rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            لا توجد بيانات كافية لهذا التقرير.
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Boxes } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AdminShell } from "@/components/admin/admin-shell";
import { AppNotFoundState } from "@/components/feedback/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useTenant } from "@/providers/tenant-provider";
import { catalogApiService } from "@/services/catalog-api.service";
import { inventoryApiService } from "@/services/inventory-api.service";
import type {
  InventoryItem,
  Recipe,
  StockMovement,
} from "@/types/cafe-operations.types";

const movementLabels: Record<StockMovement["type"], string> = {
  PURCHASE: "شراء",
  SALE: "بيع",
  WASTE: "هالك",
  ADJUSTMENT: "تسوية",
  RETURN: "مرتجع",
  ORDER_CANCELLATION_RESTORE: "استرجاع إلغاء طلب",
};

export default function InventoryItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { tenant } = useTenant();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof catalogApiService.listProducts>>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      inventoryApiService.list<InventoryItem>("inventory"),
      inventoryApiService.list<StockMovement>("stockMovements"),
      inventoryApiService.list<Recipe>("recipes"),
      catalogApiService.listProducts(),
    ]).then(([inventory, nextMovements, nextRecipes, nextProducts]) => {
      if (!active) return;
      setItem(inventory.find((entry) => entry.id === itemId) ?? null);
      setMovements(nextMovements.filter((entry) => entry.inventoryItemId === itemId));
      setRecipes(nextRecipes.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.inventoryItemId === itemId)));
      setProducts(nextProducts);
    }).catch(() => { if (active) { setItem(null); setMovements([]); setRecipes([]); setProducts([]); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId]);

  if (loading) return <AdminShell><section dir="rtl" className="p-8 text-center text-muted-foreground">جارٍ تحميل بيانات العنصر من الخادم...</section></AdminShell>;

  if (!item) {
    return (
      <AdminShell>
        <AppNotFoundState
          variant="cafe"
          description="تعذر العثور على عنصر المخزون داخل الفرع الحالي."
          actionHref="/admin/inventory"
          actionLabel="العودة إلى المخزون"
        />
      </AdminShell>
    );
  }

  const history = [...movements].slice(-8).map((movement) => ({
    date: new Date(movement.createdAt).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
    }),
    value: movement.quantityAfter,
  }));

  if (!history.length) history.push({ date: "الحالي", value: item.quantity });

  const money = (value: number) =>
    formatMoney(value, tenant.settings.currencySymbol);

  return (
    <AdminShell>
      <section dir="rtl" className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5">
        <Button asChild variant="ghost" className="mb-3 rounded-lg">
          <Link href="/admin/inventory">
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للمخزون
          </Link>
        </Button>

        <div className="mb-4">
          <p className="text-xs font-bold text-accent">تفاصيل عنصر المخزون</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black">
            <Boxes className="h-6 w-6 text-accent" />
            {item.name}
          </h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">المعلومات</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="الوحدة" value={item.unit} />
              <Info label="الكمية الحالية" value={`${item.quantity} ${item.unit}`} />
              <Info label="الحد الأدنى" value={`${item.minimumStock} ${item.unit}`} />
              <Info label="متوسط التكلفة" value={money(item.averageCost)} />
              <Info
                label="القيمة الحالية"
                value={money(item.quantity * item.averageCost)}
              />
              <Info label="الحالة" value={item.active ? "نشط" : "متوقف"} />
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">تغير الكمية مع الوقت</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--tenant-primary)"
                    fill="var(--tenant-primary)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">الاستخدام</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                المنتجات التي تستخدم هذا المكون:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recipes.map((recipe) => (
                  <Badge key={recipe.id} variant="outline">
                    {products.find((product) => product.id === recipe.productId)?.name ??
                      "منتج غير متاح"}
                  </Badge>
                ))}
                {!recipes.length ? (
                  <span className="text-sm text-muted-foreground">
                    لا توجد وصفات مرتبطة.
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">الحركات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[...movements]
                .reverse()
                .slice(0, 5)
                .map((movement) => {
                  const difference = movement.quantityAfter - movement.quantityBefore;

                  return (
                    <div
                      key={movement.id}
                      className="flex justify-between border-b pb-2 last:border-0"
                    >
                      <span>
                        {new Date(movement.createdAt).toLocaleDateString("ar-EG")} ·{" "}
                        {movementLabels[movement.type]}
                      </span>
                      <b>
                        {difference > 0 ? "+" : ""}
                        {difference} {item.unit}
                      </b>
                    </div>
                  );
                })}
              {!movements.length ? (
                <p className="text-muted-foreground">
                  لا توجد حركات لهذا العنصر.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

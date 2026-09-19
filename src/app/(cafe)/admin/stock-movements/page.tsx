"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { inventoryApiService } from "@/services/inventory-api.service";
import type {
  InventoryItem,
  StockMovement,
} from "@/types/cafe-operations.types";

const typeLabels: Record<StockMovement["type"], string> = {
  PURCHASE: "شراء",
  SALE: "بيع",
  WASTE: "هالك",
  ADJUSTMENT: "تسوية",
  RETURN: "مرتجع",
  ORDER_CANCELLATION_RESTORE: "استرجاع إلغاء طلب",
};
export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  useEffect(() => {
    const reload = () => { void Promise.all([inventoryApiService.list<StockMovement>("stockMovements"), inventoryApiService.list<InventoryItem>("inventory")]).then(([nextMovements, nextInventory]) => { setMovements(nextMovements); setInventory(nextInventory); }).catch(() => { setMovements([]); setInventory([]); }); };
    reload();
    window.addEventListener("tenant:changed", reload);
    window.addEventListener("branch:changed", reload);
    window.addEventListener("operations:changed", reload);
    return () => {
      window.removeEventListener("tenant:changed", reload);
      window.removeEventListener("branch:changed", reload);
      window.removeEventListener("operations:changed", reload);
    };
  }, []);
  const name = (id: string) =>
    inventory.find((item) => item.id === id)?.name ?? "عنصر غير موجود";
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-4 rounded-xl border bg-card p-5">
          <p className="text-xs font-bold text-accent">المخزون</p>
          <h1 className="mt-1 text-2xl font-black">حركات المخزون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجل آلي لحركات الشراء والبيع والهالك والتسويات في الفرع الحالي.
          </p>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "التاريخ",
                    "العنصر",
                    "النوع",
                    "الكمية",
                    "قبل",
                    "بعد",
                    "المرجع",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...movements].reverse().map((movement) => (
                  <tr key={movement.id} className="border-t">
                    <td className="px-4 py-3">
                      {new Date(movement.createdAt).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {name(movement.inventoryItemId)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{typeLabels[movement.type]}</Badge>
                    </td>
                    <td className="px-4 py-3">{movement.quantity}</td>
                    <td className="px-4 py-3">{movement.quantityBefore}</td>
                    <td className="px-4 py-3">{movement.quantityAfter}</td>
                    <td className="px-4 py-3">{movement.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movements.length ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                لا توجد حركات مخزون في هذا الفرع حتى الآن.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}

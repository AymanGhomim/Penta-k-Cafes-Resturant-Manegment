"use client";
import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FEATURE_GROUPS } from "@/config/plans.config";
import type { FeatureKey, Plan } from "@/types/platform.types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { platformPlansApiService } from "@/services/platform-plans-api.service";
import { toast } from "sonner";

const emptyPlan: Plan = {
  id: "",
  code: "",
  name: "",
  description: "",
  price: 0,
  active: true,
  maxBranches: 1,
  features: [],
};

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void platformPlansApiService.list().then((next) => {
      setPlans(next);
      setSelected(next[0]?.code || "");
    }).catch((error: { message?: string }) => { setPlans([]); setSelected(""); toast.error(error.message || "تعذر تحميل الباقات"); }).finally(() => setLoading(false));
  }, []);
  const save = async () => {
    if (!editing?.name.trim() || !editing.code.trim()) return toast.error("اسم الباقة والكود مطلوبان.");
    if (Number(editing.price ?? 0) < 0 || !Number.isFinite(Number(editing.price ?? 0))) return toast.error("سعر الباقة لا يمكن أن يكون سالبًا.");
    if (!Number.isInteger(editing.maxBranches) || editing.maxBranches < 1) return toast.error("الحد الأقصى للفروع يجب أن يكون رقمًا صحيحًا أكبر من صفر.");
    if (plans.some((item) => item.id !== editing.id && item.code === editing.code)) return toast.error("كود الباقة مستخدم بالفعل.");
    try {
      const saved = plans.some((item) => item.id === editing.id)
        ? await platformPlansApiService.update(editing.id, editing)
        : await platformPlansApiService.create(editing);
      setPlans((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setSelected(saved.code);
      setEditing(null);
      toast.success("تم حفظ الباقة في قاعدة البيانات");
    } catch (error) { toast.error((error as { message?: string }).message || "تعذر حفظ الباقة"); }
  };
  const remove = async (id: string) => {
    const plan = plans.find((item) => item.id === id);
    if (!plan) return;
    try { await platformPlansApiService.remove(id); const next = plans.filter((item) => item.id !== id); setPlans(next); setSelected(next[0]?.code || ""); setRemoveId(null); toast.success("تم حذف الباقة"); } catch (error) { toast.error((error as { message?: string }).message || "تعذر حذف الباقة"); setRemoveId(null); }
  };
  const activePlan = plans.find((item) => item.code === selected) || plans[0];
  const toggleFeature = (key: FeatureKey) =>
    setEditing((current) =>
      current
        ? {
            ...current,
            features: current.features.includes(key)
              ? current.features.filter((item) => item !== key)
              : [...current.features, key],
          }
        : current,
    );
  return (
    <section className="mx-auto max-w-[1500px] p-5 sm:p-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#374151]">الاشتراكات</p>
          <h1 className="mt-2 text-3xl font-black">الباقات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أضف وعدّل واحذف الباقات والمميزات المرتبطة بها.
          </p>
        </div>
        <Button
          className="bg-[#111111] hover:bg-[#374151]"
          onClick={() => setEditing({ ...emptyPlan, id: `plan-${Date.now()}` })}
        >
          <Plus className="ml-2 h-4 w-4" />
          إضافة باقة
        </Button>
      </div>
      {loading ? <div className="mt-8 h-40 animate-pulse rounded-2xl bg-slate-100" /> : <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border bg-white p-5 text-right transition ${activePlan?.id === item.id ? "border-[#111111] ring-2 ring-[#111111]/15" : "border-[#D1D5DB] hover:border-[#6B7280]"}`}
          >
            <button
              type="button"
              onClick={() => setSelected(item.code)}
              className="w-full text-right"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-black">{item.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.active ? "bg-gray-100 text-gray-700" : "bg-red-50 text-red-600"}`}
                >
                  {item.active ? "نشطة" : "غير نشطة"}
                </span>
              </div>
              <p className="mt-5 text-xs font-bold text-[#374151]">
                {item.features.length} ميزة مضمنة · حتى {item.maxBranches} فروع
              </p>
            </button>
            <div className="mt-4 flex gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditing({ ...item })}
              >
                <Pencil className="ml-1 h-3.5 w-3.5" />
                تعديل
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setRemoveId(item.id)}
                aria-label={`حذف ${item.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>}
      {activePlan ? (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">{activePlan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activePlan.description}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                {activePlan.code}
              </span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {FEATURE_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 font-black">{group.title}</h3>
                  <div className="space-y-2">
                    {group.items.map((feature) => (
                      <div
                        key={feature.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check
                          className={`h-4 w-4 ${activePlan.features.includes(feature.key) ? "text-gray-900" : "text-gray-300"}`}
                        />
                        <span
                          className={
                            activePlan.features.includes(feature.key)
                              ? "font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-10 text-center text-muted-foreground">
            لا توجد باقات حاليًا.
          </CardContent>
        </Card>
      )}
      {editing ? (
        <Dialog open onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                  {plans.some((item) => item.id === editing.id)
                    ? "تعديل الباقة"
                    : "إضافة باقة"}
                </DialogTitle>
                <DialogDescription>
                  بيانات الباقة والمميزات المتاحة للمشتركين.
                </DialogDescription>
            </DialogHeader>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                اسم الباقة
                <input
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                  className="mt-2 h-10 w-full rounded-lg border bg-white px-3"
                />
              </label>
              <label className="text-sm font-bold">
                الكود
                <input
                  value={editing.code}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      code: event.target.value
                        .toUpperCase()
                        .replace(/\s/g, "-"),
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border bg-white px-3 font-mono"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                الوصف
                <input
                  value={editing.description}
                  onChange={(event) =>
                    setEditing({ ...editing, description: event.target.value })
                  }
                  className="mt-2 h-10 w-full rounded-lg border bg-white px-3"
                />
              </label>
              <label className="text-sm font-bold">
                السعر الشهري
                <input
                  type="number"
                  min="0"
                  value={editing.price || 0}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      price: Number(event.target.value),
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border bg-white px-3"
                />
              </label>
              <label className="text-sm font-bold">
                الحد الأقصى لعدد الفروع
                <input
                  type="number"
                  min="1"
                  value={editing.maxBranches}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      maxBranches: Math.max(1, Number(event.target.value)),
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border bg-white px-3"
                />
              </label>
              <label className="flex items-center gap-2 self-end text-sm font-bold">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) =>
                    setEditing({ ...editing, active: event.target.checked })
                  }
                />
                الباقة نشطة
              </label>
            </div>
            <div className="mt-6">
              <h3 className="font-black">المميزات</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {FEATURE_GROUPS.flatMap((group) => group.items).map(
                  (feature) => (
                    <label
                      key={feature.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={editing.features.includes(feature.key)}
                        onChange={() => toggleFeature(feature.key)}
                      />
                      {feature.name}
                    </label>
                  ),
                )}
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-2 border-t pt-5">
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
              <Button
                className="bg-[#111111] hover:bg-[#374151]"
                onClick={save}
                disabled={!editing.name.trim() || !editing.code.trim()}
              >
                حفظ الباقة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="حذف الباقة؟"
        description="لن تُحذف بيانات الكافيهات الحالية، لكن يلزم نقلها إلى باقة فعالة عند التعديل التالي."
        confirmLabel="حذف الباقة"
        onConfirm={() => remove(removeId!)}
      />
    </section>
  );
}

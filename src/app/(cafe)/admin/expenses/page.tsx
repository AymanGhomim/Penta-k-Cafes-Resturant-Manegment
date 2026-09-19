"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminModulePage } from "@/components/admin/admin-module-page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { financeApiService } from "@/services/finance-api.service";
import type { Expense } from "@/types/cafe-operations.types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const blank = () => ({
  category: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  paymentMethod: "CASH" as Expense["paymentMethod"],
});

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const reload = () => { void financeApiService.listExpenses().then(setExpenses).catch(() => setExpenses([])); };
  useEffect(() => {
    reload();
    const reset = () => {
      setOpen(false);
      setForm(blank());
      reload();
    };
    window.addEventListener("tenant:changed", reset);
    window.addEventListener("branch:changed", reset);
    return () => {
      window.removeEventListener("tenant:changed", reset);
      window.removeEventListener("branch:changed", reset);
    };
  }, []);
  async function save() {
    const amount = Number(form.amount);
    if (!form.category.trim()) return toast.error("تصنيف المصروف مطلوب.");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("قيمة المصروف يجب أن تكون أكبر من صفر.");
    if (!form.date) return toast.error("تاريخ المصروف مطلوب.");
    setSaving(true);
    try {
      const value = {
        category: form.category.trim(),
        amount,
        date: form.date,
        notes: form.notes.trim(),
        paymentMethod: form.paymentMethod,
      };
      if (editingId) await financeApiService.updateExpense(editingId, value);
      else await financeApiService.createExpense(value);
      setOpen(false);
      setForm(blank());
      setEditingId(null);
      reload();
      window.dispatchEvent(new Event("operations:changed"));
      toast.success(
        editingId ? "تم تحديث المصروف بنجاح." : "تم تسجيل المصروف بنجاح.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تسجيل المصروف.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <AdminModulePage
        section="المالية"
        title="المصروفات"
        description="سجل مصروفات الفرع الحالي حسب التصنيف والتاريخ."
        action="إضافة مصروف"
        onAdd={() => {
          setEditingId(null);
          setForm(blank());
          setOpen(true);
        }}
        onEdit={(id) => {
          const record = expenses.find((item) => item.id === id);
          if (!record) return;
          setEditingId(id);
          setForm({
            category: record.category,
            amount: String(record.amount),
            date: record.date,
            notes: record.notes ?? "",
            paymentMethod: record.paymentMethod ?? "CASH",
          });
          setOpen(true);
        }}
        onDelete={setRemoveId}
        rows={expenses.map((record) => ({
          id: record.id,
          title: record.category,
          meta: `${record.date} · ${record.paymentMethod === "CASH" ? "نقدي" : record.paymentMethod ?? "—"}`,
          value: `${record.amount}`,
          status: "مسجل",
        }))}
      />
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setForm(blank());
        }}
      >
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "تعديل مصروف" : "إضافة مصروف"}
            </DialogTitle>
            <DialogDescription>
              سيتم ربط المصروف بالفرع الحالي تلقائيًا.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-semibold">
            التصنيف *
            <Input
              className="mt-1"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            طريقة الدفع
            <select
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={form.paymentMethod}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paymentMethod: event.target.value as Expense["paymentMethod"],
                }))
              }
            >
              <option value="CASH">نقدي</option>
              <option value="CARD">بطاقة</option>
              <option value="WALLET">محفظة</option>
              <option value="ONLINE">إلكتروني</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              القيمة *
              <Input
                className="mt-1"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-semibold">
              التاريخ *
              <Input
                className="mt-1"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label className="text-sm font-semibold">
            ملاحظات
            <Input
              className="mt-1"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          <Button disabled={saving} onClick={save}>
            {saving ? "جارٍ الحفظ..." : "حفظ المصروف"}
          </Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(value) => !value && setRemoveId(null)}
        title="حذف المصروف؟"
        description="سيتم حذف حركة الخزنة المرتبطة إذا كان المصروف نقديًا."
        confirmLabel="حذف"
        onConfirm={async () => {
          if (removeId) await financeApiService.removeExpense(removeId);
          setRemoveId(null);
          reload();
          toast.success("تم حذف المصروف.");
        }}
      />
    </>
  );
}

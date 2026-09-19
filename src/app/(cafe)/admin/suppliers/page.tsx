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
import { operationsApiService } from "@/services/operations-api.service";
import type { Supplier } from "@/types/cafe-operations.types";

const initial = {
  name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  active: true,
};

export default function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);
  useEffect(() => {
    const reset = () => {
      setOpen(false);
      setForm(initial);
    };
    window.addEventListener("tenant:changed", reset);
    return () => window.removeEventListener("tenant:changed", reset);
  }, []);
  const change = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!form.name.trim()) return toast.error("اسم المورد مطلوب.");
    setSaving(true);
    try {
      await operationsApiService.create<Supplier>("suppliers", {
        ...form,
        name: form.name.trim(),
        createdAt: new Date().toISOString(),
      });
      setOpen(false);
      setForm(initial);
      toast.success("تمت إضافة المورد بنجاح.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ المورد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminModulePage
        section="المشتريات"
        title="الموردون"
        description="أدر بيانات الموردين المستخدمة في فواتير الشراء."
        action="إضافة مورد"
        onAdd={() => setOpen(true)}
      />
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setForm(initial);
        }}
      >
        <DialogContent dir="rtl" className="max-w-xl">
          <DialogHeader>
            <DialogTitle>إضافة مورد</DialogTitle>
            <DialogDescription>
              أدخل بيانات التواصل الأساسية للمورد.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="اسم المورد *"
              value={form.name}
              onChange={(value) => change("name", value)}
            />
            <Field
              label="الشركة"
              value={form.company}
              onChange={(value) => change("company", value)}
            />
            <Field
              label="الهاتف"
              value={form.phone}
              onChange={(value) => change("phone", value)}
            />
            <Field
              label="البريد الإلكتروني"
              value={form.email}
              type="email"
              onChange={(value) => change("email", value)}
            />
            <Field
              label="العنوان"
              value={form.address}
              onChange={(value) => change("address", value)}
            />
            <Field
              label="ملاحظات"
              value={form.notes}
              onChange={(value) => change("notes", value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => change("active", event.target.checked)}
            />{" "}
            مورد نشط
          </label>
          <Button disabled={saving} onClick={save}>
            {saving ? "جارٍ الحفظ..." : "حفظ المورد"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <Input
        className="mt-1"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

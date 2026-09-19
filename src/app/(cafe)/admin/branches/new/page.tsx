"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canCreateBranch } from "@/services/branch.service";
import { useTenant } from "@/providers/tenant-provider";
import { useBranch } from "@/providers/branch-provider";
import { branchApiService } from "@/services/branch-api.service";

export default function NewBranchPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { branches, refreshBranches } = useBranch();
  const [form, setForm] = useState<{
    name: string; code: string; phone: string; email: string; address: string; status: "ACTIVE" | "INACTIVE";
  }>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    status: "ACTIVE",
  });
  const allowed = canCreateBranch(tenant, branches.length);
  const save = async () => {
    if (!form.name.trim()) return toast.error("اسم الفرع مطلوب");
    if (!form.address.trim()) return toast.error("عنوان الفرع مطلوب");
    try {
      const branch = await branchApiService.create(form);
      refreshBranches();
      toast.success("تم إنشاء الفرع بنجاح");
      router.push(`/admin/branches/${branch.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الفرع");
    }
  };
  return (
    <AdminShell>
      <section
        dir="rtl"
        className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5"
      >
        <div className="mb-5">
          <p className="text-xs font-bold text-accent">إدارة الفروع</p>
          <h1 className="mt-1 text-2xl font-black">إضافة فرع</h1>
        </div>
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <Field
              label="اسم الفرع *"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <Field
              label="كود الفرع"
              value={form.code}
              onChange={(code) => setForm({ ...form, code })}
            />
            <Field
              label="الهاتف"
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
            <Field
              label="البريد الإلكتروني"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              type="email"
            />
            <div className="sm:col-span-2">
              <Field
                label="العنوان *"
                value={form.address}
                onChange={(address) => setForm({ ...form, address })}
              />
            </div>
            <label className="text-sm font-bold">
              الحالة
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as "ACTIVE" | "INACTIVE",
                  })
                }
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="ACTIVE">نشط</option>
                <option value="INACTIVE">متوقف</option>
              </select>
            </label>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/admin/branches">إلغاء</Link>
              </Button>
              <Button onClick={save} disabled={!allowed}>
                إنشاء الفرع
              </Button>
            </div>
            {!allowed ? (
              <p className="sm:col-span-2 text-sm font-bold text-amber-700">
                لقد وصلت إلى الحد الأقصى للفروع المتاحة في اشتراكك.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AdminShell>
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
    <label className="text-sm font-bold">
      {label}
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2"
      />
    </label>
  );
}

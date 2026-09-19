"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { PLATFORM_CONFIG } from "@/config/platform.config";
import { useAuthStore } from "@/store/auth.store";
import { platformAuthService } from "@/services/platform-auth.service";

export default function PlatformLoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await platformAuthService.login(email.trim(), password);
      login({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: "platform_super_admin",
        tenantId: result.user.tenantId ?? undefined,
      });
      router.replace("/platform/dashboard");
    } catch (requestError) {
      const error = requestError as { message?: string };
      setError(error.message || "بيانات الدخول غير صحيحة.");
      setIsSubmitting(false);
    }
  };

  return (
    <main dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F8FA] px-4 py-8 sm:px-6 lg:px-10">
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#DCE7EA] bg-white shadow-[0_24px_80px_rgba(16,24,40,0.12)] lg:min-h-[610px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#111827] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div><PlatformLogo light /><div className="mt-20 max-w-sm"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles className="h-3.5 w-3.5" />منصة تشغيل ذكية</span><h2 className="mt-6 text-4xl font-black leading-tight">كل فروعك،<br /><span className="text-[#E5E7EB]">في مكان واحد.</span></h2><p className="mt-5 text-sm leading-7 text-slate-300">Penta-K لإدارة المقاهي والمطاعم والاشتراكات من لوحة موحدة.</p></div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><ShieldCheck className="h-5 w-5" /><p className="mt-3 text-sm font-bold">تحكم مركزي آمن</p></div>
        </section>
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-14"><div className="mb-10 lg:hidden"><PlatformLogo /></div><div className="mx-auto w-full max-w-md">
          <p className="text-sm font-black text-[#374151]">مرحبًا بك في {PLATFORM_CONFIG.name}</p><h1 className="mt-3 text-3xl font-black text-[#101828]">دخول إدارة المنصة</h1><p className="mt-3 text-sm leading-6 text-[#667085]">سجّل الدخول لإدارة الكافيهات والاشتراكات من مكان واحد.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block text-sm font-bold text-[#344054]">البريد الإلكتروني<div className="relative mt-2"><Mail className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#374151]" /><Input dir="ltr" autoComplete="username" className="h-12 bg-[#FAFAFA] pr-10" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
            <label className="block text-sm font-bold text-[#344054]">كلمة المرور<div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#374151]" /><Input dir="ltr" autoComplete="current-password" className="h-12 bg-[#FAFAFA] pl-10 pr-10" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3 top-3.5 text-[#6B7280]" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
            {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p> : null}
            <Button disabled={isSubmitting} className="h-12 w-full gap-2 bg-[#374151] text-white hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-70" type="submit">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />جارٍ تسجيل الدخول...</> : <>تسجيل الدخول <ArrowLeft className="h-4 w-4" /></>}</Button>
          </form>
          <p className="mt-8 text-center text-xs text-[#98A2B3]">{PLATFORM_CONFIG.name} · {PLATFORM_CONFIG.tagline}</p>
        </div></section>
      </div>
    </main>
  );
}

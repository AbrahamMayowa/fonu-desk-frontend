"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient, ApiError } from "@/lib/api";
import { Mail, CheckCircle2, Loader2, ArrowRight, RefreshCw } from "lucide-react";

const verifySchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  const emailValue = watch("email");

  useEffect(() => {
    // Attempt to load signup email from sessionStorage
    const storedEmail = sessionStorage.getItem("signup_email");
    if (storedEmail) {
      setValue("email", storedEmail);
    }
  }, [setValue]);

  const onSubmit = async (values: VerifyFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.auth.verifyEmail(values);
      sessionStorage.removeItem("signup_email");
      router.push("/login?verified=true");
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (Array.isArray(apiErr.message)) {
        setErrorMsg(apiErr.message.join(", "));
      } else {
        setErrorMsg(apiErr.message || "Invalid or expired OTP verification code.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!emailValue) {
      setErrorMsg("Please enter your email address to resend the code.");
      return;
    }

    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await apiClient.auth.resendOtp({ email: emailValue });
      setSuccessMsg(response.message || "A new verification code has been sent.");
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(
        Array.isArray(apiErr.message)
          ? apiErr.message.join(", ")
          : apiErr.message || "Failed to resend verification code."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50">
        <div className="flex flex-col items-center">
          <Image
            src="/fonu-desk-logo-text.svg"
            alt="Fonu Desk Logo"
            width={160}
            height={36}
            priority
            className="h-10 w-auto mb-6"
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            We have sent a 6-digit verification code to your inbox
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                {...register("email")}
                placeholder="owner@company.com"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Verification Code (6 Digits)
            </label>
            <input
              type="text"
              maxLength={6}
              {...register("code")}
              placeholder="123456"
              className={`block w-full rounded-lg border px-3 py-3 text-center font-mono text-xl tracking-widest outline-none transition-all placeholder-slate-300 ${
                errors.code
                  ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              }`}
            />
            {errors.code && (
              <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 transition-colors disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend OTP
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Confirm Code
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm mt-6">
          <span className="text-slate-500">Back to </span>
          <a href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

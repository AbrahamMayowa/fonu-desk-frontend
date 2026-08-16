"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api";
import { Lock, Loader2, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";

const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .length(6, "Reset code must be exactly 6 digits")
      .regex(/^\d+$/, "Code must contain only numbers"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("reset_email");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!email) {
      toast.error("Session expired or email missing. Please request a new password reset code.");
      router.push("/forgot-password");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.auth.changePassword({
        email,
        code: values.code,
        newPassword: values.newPassword,
      });
      sessionStorage.removeItem("reset_email");
      toast.success("Password changed successfully! Please sign in with your new password.");
      router.push("/login");
    } catch (err: any) {
      const apiErr = err as ApiError;
      const message = Array.isArray(apiErr.message)
        ? apiErr.message.join(", ")
        : apiErr.message || "Invalid or expired reset code.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Session expired or email missing. Please request a new reset code.");
      router.push("/forgot-password");
      return;
    }

    setIsResending(true);
    try {
      const response = await apiClient.auth.forgotPassword(email);
      toast.success(response.message || "A new password reset code has been sent.");
    } catch (err: any) {
      const apiErr = err as ApiError;
      const message = Array.isArray(apiErr.message)
        ? apiErr.message.join(", ")
        : apiErr.message || "Failed to resend reset code.";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl">
        <div className="flex flex-col items-center">
          <Image
            src="/fonu-desk-logo-text.png"
            alt="Fonu Desk Logo"
            width={180}
            height={40}
            priority
            className="h-10 w-auto mb-6 object-contain"
          />
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Enter the 6-digit code sent to{" "}
            {email ? (
              <span className="font-semibold text-slate-700">{email}</span>
            ) : (
              "your email"
            )}{" "}
            and choose your new password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Reset Code (6 Digits)
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                {...register("newPassword")}
                placeholder="••••••••"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.newPassword
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                {...register("confirmPassword")}
                placeholder="••••••••"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.confirmPassword
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
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
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

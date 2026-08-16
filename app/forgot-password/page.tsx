"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api";
import { Mail, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.auth.forgotPassword(values.email);
      toast.success(response.message || "If the email exists, a reset code has been sent.");
      sessionStorage.setItem("reset_email", values.email);
      router.push("/reset-password");
    } catch (err: any) {
      const apiErr = err as ApiError;
      const message = Array.isArray(apiErr.message)
        ? apiErr.message.join(", ")
        : apiErr.message || "Failed to process request. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Enter your account email address and we'll send you an OTP code to reset your password.
          </p>
        </div>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset code...
              </>
            ) : (
              <>
                Send Reset Code
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
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

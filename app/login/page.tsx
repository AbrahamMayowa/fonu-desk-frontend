"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError } from "@/lib/api";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.auth.login(values);
      toast.success("Sign in successful! Loading workspace...");
      await login(response.accessToken, response.user);
    } catch (err: any) {
      const apiErr = err as ApiError;
      
      // Check if they need to verify email
      if (apiErr.statusCode === 401 && apiErr.message?.toString().toLowerCase().includes("verify")) {
        toast.error("Please verify your email address before logging in.");
        // Store email to assist verify-email pre-fill
        sessionStorage.setItem("signup_email", values.email);
        setTimeout(() => {
          router.push("/verify-email");
        }, 1500);
      } else {
        const message = Array.isArray(apiErr.message)
          ? apiErr.message.join(", ")
          : apiErr.message || "Invalid email or password.";
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl ">
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
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter your credentials to access your support dashboard
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
              placeholder="you@company.com"
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                errors.password
                  ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              }`}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-sm mt-6">
        <span className="text-slate-500">Don't have an account? </span>
        <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign Up (Owner)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <span className="text-sm font-semibold text-slate-500">Loading sign in...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

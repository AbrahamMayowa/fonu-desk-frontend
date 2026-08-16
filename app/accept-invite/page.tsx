"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient, ApiError } from "@/lib/api";
import { User, Lock, Loader2, ArrowRight, CircleAlert } from "lucide-react";

const inviteSchema = z.object({
  token: z.string().min(1, "Invitation token is missing"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      token: token,
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  // Pre-fill token value from search params
  useEffect(() => {
    if (token) {
      setValue("token", token);
    }
  }, [token, setValue]);

  const onSubmit = async (values: InviteFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.users.acceptInvite(values);
      router.push("/login?verified=true"); // Re-use verification success banner
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to accept invitation. Token may be expired or invalid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          Accept Invitation
        </h2>
        <p className="mt-2 text-sm text-slate-500 text-center">
          Complete your details to activate your member account
        </p>
      </div>

      {!token && (
        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-2">
          <CircleAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-700">
            No invitation token detected. Please open the link sent to your email.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("token")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              First Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                {...register("firstName")}
                placeholder="Sarah"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.firstName
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Last Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                {...register("lastName")}
                placeholder="Smith"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.lastName
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Set Password
          </label>
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
          disabled={isSubmitting || !token}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              Join Workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-sm mt-6">
        <span className="text-slate-500">Back to </span>
        <a href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign In
        </a>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <span className="text-sm font-semibold text-slate-500">Loading invitation...</span>
          </div>
        }
      >
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError } from "@/lib/api";
import { Building, ArrowLeft, Loader2, Plus } from "lucide-react";

const orgSchema = z.object({
  name: z.string().min(5, "Organization name must be at least 5 characters"),
});

type OrgFormValues = z.infer<typeof orgSchema>;

export default function CreateOrganizationPage() {
  const { user, organizations, switchOrg, refreshOrgs } = useAuth();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
  });

  const onSubmit = async (values: OrgFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newOrg = await apiClient.organizations.create(values);
      await refreshOrgs();
      // Immediately switch context to the newly created organization
      await switchOrg(newOrg.id);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Organization registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasWorkspaces = organizations.length > 0;

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
            Create an Organization
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Set up a new workspace context to manage tickets and invite users
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Organization Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Building className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                {...register("name")}
                placeholder="Google LLC"
                className={`block w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                  errors.name
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
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
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Workspace
              </>
            )}
          </button>
        </form>

        {hasWorkspaces && (
          <div className="text-center mt-6 border-t border-slate-100 pt-6">
            <Link
              href="/select-organization"
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to selection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

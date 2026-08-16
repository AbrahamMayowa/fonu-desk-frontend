"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  ArrowLeft,
  Loader2,
  FileImage,
  User,
  Plus,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  onBehalf: z.boolean(),
  customerId: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function CreateTicketPage() {
  const { user, roles, activeOrgId, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File attachment states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachment, setAttachment] = useState<{
    fileName: string;
    fileUrl: string;
    fileType: string;
  } | null>(null);

  // On-Behalf-Of states
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const isTeamMember = roles.includes("OWNER") || roles.includes("ADMIN") || roles.includes("SUPPORT");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: "MEDIUM",
      onBehalf: false,
      customerId: "",
    },
  });

  const onBehalfWatch = watch("onBehalf");

  // Load customer users if Team Member and OnBehalf is checked
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!isTeamMember || !onBehalfWatch || !activeOrgId) return;
      setLoadingCustomers(true);
      try {
        const response = await apiClient.users.customers();
        setCustomers(response || []);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [onBehalfWatch, isTeamMember, activeOrgId]);

  // Handle image conversion and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("File size must be under 3MB.");
      return;
    }

    setUploadingFile(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const uploadRes = await apiClient.tickets.uploadImage(base64);
        setAttachment({
          fileName: file.name,
          fileUrl: uploadRes.fileUrl,
          fileType: file.type,
        });
        setSuccessMsg("Attachment uploaded successfully!");
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to upload image. Make sure it is a valid format.");
      } finally {
        setUploadingFile(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Error reading file.");
      setUploadingFile(false);
    };
  };

  const onSubmit = async (values: TicketFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (values.onBehalf && values.customerId) {
        // Resolve customer business context mapping
        const selectedMember = customers.find((c) => c.userId === values.customerId);
        await apiClient.tickets.createOnBehalf({
          title: values.title,
          description: values.description,
          priority: values.priority,
          customerId: values.customerId,
          businessId: selectedMember?.businessId || "", // Resolve business ID from member record
        });
      } else {
        await apiClient.tickets.create({
          title: values.title,
          description: values.description,
          priority: values.priority,
          attachment: attachment || undefined,
        });
      }
      setSuccessMsg("Ticket submitted successfully! Redirecting...");
      setTimeout(() => {
        router.push("/tickets");
      }, 1500);
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to submit support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>
      </div>

      <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
          Create a Support Ticket
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Submit details of the query/issue, and we'll start investigating.
        </p>

        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex gap-2 mb-6">
            <CircleAlert className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex gap-2 mb-6">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* On behalf of check */}
          {isTeamMember && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="onBehalf"
                  {...register("onBehalf")}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="onBehalf" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Create ticket on behalf of a customer
                </label>
              </div>

              {onBehalfWatch && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Select Customer User
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      {loadingCustomers ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <User className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <select
                      {...register("customerId")}
                      className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.userId} value={c.userId}>
                          {c.user?.firstName} {c.user?.lastName} ({c.user?.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.customerId && (
                    <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Subject / Title
            </label>
            <input
              type="text"
              {...register("title")}
              placeholder="e.g. Database replication lag high"
              className={`block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                errors.title
                  ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description of the Issue
            </label>
            <textarea
              rows={5}
              {...register("description")}
              placeholder="Please explain the problem in detail so our support agents can troubleshoot effectively..."
              className={`block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder-slate-400 ${
                errors.description
                  ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Severity / Priority
            </label>
            <div className="grid grid-cols-4 gap-3">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((level) => {
                const isSelected = watch("priority") === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setValue("priority", level as any)}
                    className={`rounded-lg border py-2.5 text-xs font-semibold text-center uppercase transition-colors ${
                      isSelected
                        ? "bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Uploader */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Attach Screenshot (Optional)
            </label>

            <div className="mt-1 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors">
                <FileImage className="h-4 w-4" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>

              {uploadingFile && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  Uploading attachment...
                </div>
              )}
            </div>

            {attachment && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 max-w-sm">
                <img
                  src={attachment.fileUrl}
                  alt="Attachment Preview"
                  className="h-10 w-10 shrink-0 rounded object-cover border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {attachment.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">Secure Cloudinary Link</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || uploadingFile}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting ticket...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Submit Ticket
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}

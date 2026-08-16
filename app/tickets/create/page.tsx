"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError, AttachmentItem } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  FileImage,
  User,
  Plus,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Flame,
  Building,
  Paperclip,
  FileText,
  X,
} from "lucide-react";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  onBehalf: z.boolean(),
  businessId: z.string().optional(),
  customerId: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function CreateTicketPage() {
  const { user, roles, activeOrgId, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // File attachment states (supports multiple attachments)
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // On-Behalf-Of states
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
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
      businessId: "",
      customerId: "",
    },
  });

  const onBehalfWatch = watch("onBehalf");
  const businessIdWatch = watch("businessId");

  // Load business list when onBehalf is checked
  useEffect(() => {
    const fetchBusinesses = async () => {
      if (!isTeamMember || !onBehalfWatch || !activeOrgId) return;
      setLoadingBusinesses(true);
      try {
        const response = await apiClient.businesses.list({ limit: 100 });
        setBusinesses(response.data || []);
      } catch (err) {
        console.error("Failed to load businesses:", err);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    fetchBusinesses();
  }, [onBehalfWatch, isTeamMember, activeOrgId]);

  // Load customer users when business selection or onBehalf changes
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!isTeamMember || !onBehalfWatch || !activeOrgId) return;
      setLoadingCustomers(true);
      try {
        let data: any[] = [];
        if (businessIdWatch) {
          try {
            data = await apiClient.users.business(businessIdWatch);
          } catch (e) {
            data = await apiClient.users.customers(businessIdWatch);
          }
        } else {
          data = await apiClient.users.customers();
        }
        setCustomers(data || []);
      } catch (err) {
        console.error("Failed to load customers:", err);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [businessIdWatch, onBehalfWatch, isTeamMember, activeOrgId]);

  // Handle file conversion and uploads (supports multiple files)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const isImageType = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
      if (!isImageType) {
        toast.error(`File "${file.name}" is not an image. Only image attachments (PNG, JPG, WEBP, GIF, SVG) are supported.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Image "${file.name}" exceeds the 5MB limit.`);
        return;
      }
    }

    setUploadingFile(true);

    try {
      const uploadedItems: AttachmentItem[] = [];
      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const uploadRes = await apiClient.tickets.uploadImage(base64);
        uploadedItems.push({
          fileName: file.name,
          fileUrl: uploadRes.fileUrl,
          fileType: file.type || "application/octet-stream",
        });
      }
      setAttachments((prev) => [...prev, ...uploadedItems]);
      toast.success(
        uploadedItems.length === 1
          ? "Attachment uploaded successfully!"
          : `${uploadedItems.length} attachments uploaded successfully!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload attachment(s). Make sure files are valid.");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: TicketFormValues) => {
    setIsSubmitting(true);

    try {
      const payloadAttachments = attachments.length > 0 ? attachments : undefined;

      if (values.onBehalf && values.customerId) {
        // Resolve customer business context mapping
        const selectedMember = customers.find((c) => c.userId === values.customerId);
        await apiClient.tickets.createOnBehalf({
          title: values.title,
          description: values.description,
          priority: values.priority,
          customerId: values.customerId,
          businessId: selectedMember?.businessId || "",
          attachments: payloadAttachments,
        });
      } else {
        await apiClient.tickets.create({
          title: values.title,
          description: values.description,
          priority: values.priority,
          attachments: payloadAttachments,
        });
      }
      toast.success("Ticket submitted successfully!");
      setTimeout(() => {
        router.push("/tickets");
      }, 1000);
    } catch (err: any) {
      const apiErr = err as ApiError;
      const message = Array.isArray(apiErr.message)
        ? apiErr.message.join(", ")
        : apiErr.message || "Failed to submit support ticket.";
      toast.error(message);
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

      <div className="max-w-2xl bg-white rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
          Create a Support Ticket
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Submit details of the query/issue, and we'll start investigating.
        </p>

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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  {/* Select Business */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Select Customer Business
                    </label>
                    <Select
                      value={watch("businessId") || "ALL"}
                      onValueChange={(val) => {
                        const nextVal = val === "ALL" ? "" : val;
                        setValue("businessId", nextVal);
                        setValue("customerId", "");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- All Businesses --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">-- All Businesses --</SelectItem>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.industry ? `(${b.industry})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Customer User */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Select Customer User
                    </label>
                    <Select
                      value={watch("customerId") || "NONE"}
                      onValueChange={(val) => {
                        const nextVal = val === "NONE" ? "" : val;
                        setValue("customerId", nextVal, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Choose Customer --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">-- Choose Customer --</SelectItem>
                        {customers.map((c) => {
                          const u = c.user || c;
                          const id = c.userId || u.id || c.id;
                          const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email || id;
                          return (
                            <SelectItem key={id} value={id}>
                              {name} ({u.email})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {errors.customerId && (
                      <p className="mt-1 text-xs text-red-500">{errors.customerId.message}</p>
                    )}
                  </div>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Priority Level
            </label>
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1 w-full sm:w-auto">
              {[
                { id: "LOW", label: "Low", dotColor: "bg-slate-400" },
                { id: "MEDIUM", label: "Medium", dotColor: "bg-blue-500" },
                { id: "HIGH", label: "High", dotColor: "bg-amber-500" },
                { id: "URGENT", label: "Urgent", dotColor: "bg-red-500" },
              ].map((item) => {
                const isSelected = watch("priority") === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setValue("priority", item.id as any)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Attachments Uploader */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              Attach Files / Screenshots (Optional)
            </label>

            <div className="mt-1 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors">
                <FileImage className="h-4 w-4" />
                Upload Files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>

              {uploadingFile && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  Uploading attachment(s)...
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att, idx) => {
                  const isImage = (att.fileType && att.fileType.startsWith("image/")) || /\.(png|jpe?g|gif|webp)$/i.test(att.fileName);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 relative"
                    >
                      {isImage ? (
                        <img
                          src={att.fileUrl}
                          alt={att.fileName}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {att.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{att.fileType || "Attachment"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
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

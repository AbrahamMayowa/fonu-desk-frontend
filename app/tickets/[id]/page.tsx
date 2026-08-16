"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError } from "@/lib/api";
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
  User,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  EyeOff,
  BellOff,
  Bell,
  Send,
  MessageSquare,
  AlertTriangle,
  History,
  FileDown,
  Loader2,
  Paperclip,
  FileText,
} from "lucide-react";

const getPriorityBadgeClass = (priority: string) => {
  switch (priority?.toUpperCase()) {
    case "URGENT":
      return "bg-red-50 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "RESOLVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CLOSED":
      return "bg-slate-100 text-slate-800 border-slate-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

interface CommentItem {
  id: string;
  content: string;
  isInternal: boolean;
  ticketId: string;
  authorId: string;
  createdAt: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface HistoryItem {
  id: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  ticketId: string;
  changedById: string;
  createdAt: string;
  changedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Unified Timeline Item type
type TimelineItem = 
  | { type: "comment"; id: string; date: Date; data: CommentItem }
  | { type: "history"; id: string; date: Date; data: HistoryItem };

export default function TicketDetailsPage({ params }: PageProps<"/tickets/[id]">) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const { user, roles, activeOrgId, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core Data
  const [ticket, setTicket] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [attachmentsState, setAttachmentsState] = useState<any[]>([]);

  // Comment Editor state
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const isTeamMember = roles.includes("OWNER") || roles.includes("ADMIN") || roles.includes("SUPPORT");
  const isOwnerAdmin = roles.includes("OWNER") || roles.includes("ADMIN");

  const loadTicketDetails = async () => {
    if (!ticketId || !activeOrgId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const [ticketRes, commentsRes] = await Promise.all([
        apiClient.tickets.get(ticketId),
        apiClient.tickets.getComments(ticketId),
      ]);

      setTicket(ticketRes);
      
      // Fetch ticket attachments from GET /tickets/:id/attachments
      try {
        const attachmentsRes = await apiClient.tickets.attachments(ticketId);
        if (attachmentsRes && Array.isArray(attachmentsRes) && attachmentsRes.length > 0) {
          setAttachmentsState(attachmentsRes);
        }
      } catch (e) {
        console.error("Failed to load attachments:", e);
      }
      
      // Determine if ticket is muted (simulate check from ticket properties or local flag)
      setIsMuted(ticketRes.isMuted || false);

      // Compile chronological timeline
      const compiledTimeline: TimelineItem[] = [];

      // Add comments
      commentsRes.forEach((c) => {
        compiledTimeline.push({
          type: "comment",
          id: c.id,
          date: new Date(c.createdAt),
          data: c,
        });
      });

      // Fetch history audits if team member
      if (isTeamMember) {
        try {
          const historyRes = await apiClient.tickets.getHistory(ticketId);
          historyRes.forEach((h) => {
            compiledTimeline.push({
              type: "history",
              id: h.id,
              date: new Date(h.createdAt),
              data: h,
            });
          });
        } catch (e) {
          console.error("Failed to load ticket audit history:", e);
        }
      }

      // Sort timeline chronologically by date
      compiledTimeline.sort((a, b) => a.date.getTime() - b.date.getTime());
      setTimeline(compiledTimeline);

      // Load agents list for manual assignment dropdown
      if (isOwnerAdmin) {
        try {
          const orgMembers = await apiClient.users.organization();
          const supportAgents = orgMembers.filter(
            (m) => m.role?.name === "SUPPORT" || m.role?.name === "ADMIN" || m.role?.name === "OWNER"
          );
          setAgents(supportAgents);
        } catch (e) {
          console.error("Failed to load support agents:", e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Unauthorized to view this ticket or it has been removed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId && activeOrgId && !authLoading) {
      loadTicketDetails();
    }
  }, [ticketId, activeOrgId, authLoading]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await apiClient.tickets.update(ticketId, { status });
      await loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    try {
      await apiClient.tickets.update(ticketId, { priority });
      await loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    try {
      await apiClient.tickets.assign(ticketId, agentId ? agentId : null);
      await loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMute = async () => {
    try {
      if (isMuted) {
        await apiClient.tickets.unmute(ticketId);
        setIsMuted(false);
      } else {
        await apiClient.tickets.mute(ticketId);
        setIsMuted(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await apiClient.tickets.addComment(ticketId, {
        content: newComment,
        isInternal: isInternal && isTeamMember, // Guard internal comments
      });
      setNewComment("");
      setIsInternal(false);
      await loadTicketDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
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

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 mb-8 max-w-xl">
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      )}

      {!loading && ticket && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Timeline Feed & Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header & Description */}
            <div className="bg-white rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                    {ticket.title}
                  </h1>
                  <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-2">
                    <span>Ticket #{ticket.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>Created by {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
                    <span>•</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>

                {/* Mute Ticket Button */}
                <button
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all focus:outline-none ${
                    isMuted
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {isMuted ? (
                    <>
                      <BellOff className="h-4 w-4" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Mute Updates
                    </>
                  )}
                </button>
              </div>

              <div className="prose max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>

              {/* Attachments preview */}
              {(() => {
                const attachmentList: Array<{ id?: string; fileName: string; fileUrl: string; fileType?: string }> =
                  attachmentsState.length > 0
                    ? attachmentsState
                    : ticket.attachments && ticket.attachments.length > 0
                    ? ticket.attachments
                    : ticket.attachment
                    ? [ticket.attachment]
                    : [];

                if (attachmentList.length === 0) return null;

                return (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                      Attachments ({attachmentList.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachmentList.map((att, idx) => {
                        const isImage =
                          (att.fileType && att.fileType.startsWith("image/")) ||
                          /\.(png|jpe?g|gif|webp)$/i.test(att.fileName);
                        return (
                          <div
                            key={att.id || idx}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-slate-300"
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
                              <a
                                href={att.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 mt-0.5"
                              >
                                <FileDown className="h-3.5 w-3.5" />
                                Download / View
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Chronological Timeline */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 px-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                Ticket Timeline
              </h2>

              <div className="space-y-4 relative pl-4 border-l border-slate-200">
                {timeline.map((item) => {
                  if (item.type === "comment") {
                    const c = item.data;
                    const isAuthorTeam = Boolean(c.author?.email && c.author.email.includes("@company")) || c.isInternal;
                    return (
                      <div
                        key={c.id}
                        className={`relative rounded-xl border p-4 text-sm ${
                          c.isInternal
                            ? "bg-amber-50/60 border-amber-200 text-slate-700"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        {/* Timeline point */}
                        <span className="absolute -left-[23px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 border-2 border-slate-50" />

                        <div className="flex items-center justify-between border-b border-slate-100/80 pb-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {c.author
                                ? `${c.author.firstName || ""} ${c.author.lastName || ""}`.trim() || c.author.email || "User"
                                : "User"}
                            </span>
                            {c.isInternal && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <Lock className="h-3 w-3" />
                                Internal Support Note
                              </span>
                            )}
                            {!c.isInternal && isAuthorTeam && (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                Staff
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    );
                  } else {
                    // History Audit Trail note
                    const h = item.data;
                    return (
                      <div key={h.id} className="relative flex items-center gap-2 py-1 px-4 text-xs text-slate-400 font-medium">
                        {/* Timeline point */}
                        <span className="absolute -left-[22px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-100 border border-slate-300" />
                        <History className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span>
                          <strong className="text-slate-600 font-bold">
                            {h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : "System"}
                          </strong>{" "}
                          changed <span className="font-semibold text-slate-500">{h.fieldChanged}</span> from{" "}
                          <span className="italic text-slate-500">"{h.oldValue || "None"}"</span> to{" "}
                          <span className="italic text-slate-600 font-semibold">"{h.newValue || "None"}"</span>
                        </span>
                        <span className="text-[9px] text-slate-300 ml-auto">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Comment timeline reply editor */}
            <div className="bg-white rounded-2xl p-6">
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <textarea
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your response to the support ticket..."
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />

                <div className="flex items-center justify-between">
                  {/* Internal comment lock check for team */}
                  {isTeamMember ? (
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="isInternal"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <label
                        htmlFor="isInternal"
                        className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer select-none"
                      >
                        <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                        Post as Internal Support Note (Staff only)
                      </label>
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Ticket Metadata Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                Ticket Properties
              </h3>

              {/* Status Update */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Status
                </label>
                {isTeamMember ? (
                  <Select
                    value={ticket.status}
                    onValueChange={(val) => handleUpdateStatus(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                      <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                )}
              </div>

              {/* Priority Update */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Priority / Severity
                </label>
                {isTeamMember ? (
                  <Select
                    value={ticket.priority}
                    onValueChange={(val) => handleUpdatePriority(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="URGENT">URGENT</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                )}
              </div>

              {/* Agent Manual Assignment (Owners/Admins) */}
              {isOwnerAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assignee (Agent)
                  </label>
                  <Select
                    value={ticket.assignedToId || "UNASSIGNED"}
                    onValueChange={(val) => handleAssignAgent(val === "UNASSIGNED" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Unassigned --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">-- Unassigned --</SelectItem>
                      {agents.map((ag) => (
                        <SelectItem key={ag.userId} value={ag.userId}>
                          {ag.user?.firstName} {ag.user?.lastName} ({ag.role?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Static details */}
              <div className="border-t border-slate-100 pt-6 space-y-4 text-xs font-medium text-slate-500">
                <div className="flex justify-between">
                  <span>Customer Profile:</span>
                  <span className="text-slate-800 font-bold truncate max-w-[150px]">
                    {ticket.createdBy?.email}
                  </span>
                </div>
                {ticket.business && (
                  <div className="flex justify-between">
                    <span>B2B Company:</span>
                    <span className="text-slate-800 font-bold truncate max-w-[150px]">
                      {ticket.business.name}
                    </span>
                  </div>
                )}
                {ticket.assignedTo && !isOwnerAdmin && (
                  <div className="flex justify-between">
                    <span>Assigned Support:</span>
                    <span className="text-brand-600 font-bold">
                      {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                    </span>
                  </div>
                )}
                {!ticket.assignedTo && !isOwnerAdmin && (
                  <div className="flex justify-between">
                    <span>Assigned Support:</span>
                    <span className="text-slate-400 italic">None</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Created At:</span>
                  <span className="text-slate-800">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update:</span>
                  <span className="text-slate-800">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

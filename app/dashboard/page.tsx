"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Users,
  UserCheck,
  AlertTriangle,
  History,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";

// Types for stats
interface AdminStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  totalCustomers: number;
  totalAgents: number;
}

interface AgentStats {
  assignedTickets: number;
  openAssignedTickets: number;
  resolvedAssignedTickets: number;
  unassignedTickets: number;
}

interface CustomerStats {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
}

// Helpers for styling
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

export default function DashboardPage() {
  const { user, roles, activeOrgId, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Data states
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [adminActivity, setAdminActivity] = useState<any[]>([]);

  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [agentTickets, setAgentTickets] = useState<any[]>([]);
  const [unassignedTickets, setUnassignedTickets] = useState<any[]>([]);

  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);

  const isOwnerAdmin = roles.includes("OWNER") || roles.includes("ADMIN");
  const isAgent = roles.includes("SUPPORT");
  const isCustomer = roles.includes("CUSTOMER");

  const loadDashboardData = async (bypassCache = false) => {
    if (!activeOrgId) return;
    setLoading(true);
    setError(null);

    try {
      if (isOwnerAdmin) {
        const [statsResult, ticketsResult, activityResult] = await Promise.allSettled([
          apiClient.dashboards.admin.stats(bypassCache),
          apiClient.dashboards.admin.recentTickets(bypassCache),
          apiClient.dashboards.admin.recentActivity(bypassCache),
        ]);

        if (statsResult.status === "fulfilled") setAdminStats(statsResult.value);
        if (ticketsResult.status === "fulfilled") setAdminTickets(ticketsResult.value.data || []);
        if (activityResult.status === "fulfilled") setAdminActivity(activityResult.value.data || []);
      } else if (isAgent) {
        const [statsResult, myTicketsResult, unassignedResult] = await Promise.allSettled([
          apiClient.dashboards.agent.stats(bypassCache),
          apiClient.dashboards.agent.myTickets(bypassCache),
          apiClient.dashboards.agent.unassignedTickets(bypassCache),
        ]);

        if (statsResult.status === "fulfilled") setAgentStats(statsResult.value);
        if (myTicketsResult.status === "fulfilled") setAgentTickets(myTicketsResult.value.data || []);
        if (unassignedResult.status === "fulfilled") setUnassignedTickets(unassignedResult.value.data || []);
      } else if (isCustomer) {
        const [statsResult, recentResult] = await Promise.allSettled([
          apiClient.dashboards.customer.stats(bypassCache),
          apiClient.dashboards.customer.recentTickets(bypassCache),
        ]);

        if (statsResult.status === "fulfilled") setCustomerStats(statsResult.value);
        if (recentResult.status === "fulfilled") setCustomerTickets(recentResult.value.data || []);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard metrics. Retrying in background.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrgId && !authLoading) {
      loadDashboardData(false);
    }
  }, [activeOrgId, authLoading]);

  const handleManualRefresh = () => {
    loadDashboardData(true);
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
      {/* Top Welcome Title & Refresh notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here's what is happening in your workspace today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            Cached for 3 mins • Last sync:{" "}
            {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors focus:outline-none"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 />
        </div>
      )}

      {!loading && (
        <>
          {/* ==================== OWNER / ADMIN VIEW ==================== */}
          {isOwnerAdmin && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  { name: "Total Tickets", value: adminStats?.totalTickets ?? 0, icon: Inbox, color: "text-blue-600 bg-blue-50" },
                  { name: "Open Tickets", value: adminStats?.openTickets ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                  { name: "Closed Tickets", value: adminStats?.closedTickets ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                  { name: "Unassigned", value: adminStats?.unassignedTickets ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
                  { name: "Total Customers", value: adminStats?.totalCustomers ?? 0, icon: Users, color: "text-purple-600 bg-purple-50" },
                  { name: "Support Agents", value: adminStats?.totalAgents ?? 0, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${stat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                      </div>
                      <p className="mt-4 text-3xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Tickets Table */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Recent Support Requests</h2>
                    <Link href="/tickets" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
                      View all tickets
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="py-2.5">Title</th>
                          <th className="py-2.5">Priority</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {adminTickets.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No tickets submitted yet.
                            </td>
                          </tr>
                        ) : (
                          adminTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-slate-50/50">
                              <td className="py-3 font-semibold text-slate-800 truncate max-w-[200px]">
                                {ticket.title}
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 ${getPriorityBadgeClass(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusBadgeClass(ticket.status)}`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <Link
                                  href={`/tickets/${ticket.id}`}
                                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* System Audit logs */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Organization Audit Trail</h2>
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <History className="h-3.5 w-3.5" />
                      Live logs
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {adminActivity.length === 0 ? (
                      <p className="text-center py-8 text-sm text-slate-400">No actions recorded yet.</p>
                    ) : (
                      adminActivity.map((log) => (
                        <div key={log.id} className="flex gap-3 text-sm">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs uppercase">
                            {log.actor?.firstName?.[0] || "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 leading-snug">
                              <span className="font-bold text-slate-900">
                                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"}
                              </span>{" "}
                              performed{" "}
                              <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {log.action}
                              </span>{" "}
                              on {log.entityType}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUPPORT AGENT VIEW ==================== */}
          {isAgent && (
            <div className="space-y-8">
              {/* Agent Stats Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: "My Assigned Tickets", value: agentStats?.assignedTickets ?? 0, icon: Inbox, color: "text-blue-600 bg-blue-50" },
                  { name: "Active / Open", value: agentStats?.openAssignedTickets ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                  { name: "Resolved By Me", value: agentStats?.resolvedAssignedTickets ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                  { name: "Unassigned In Queue", value: agentStats?.unassignedTickets ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${stat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                      </div>
                      <p className="mt-4 text-3xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Queues */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* My Tickets */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
                    My Active Queue (Top 5)
                  </h2>

                  <div className="space-y-3">
                    {agentTickets.length === 0 ? (
                      <p className="text-center py-8 text-sm text-slate-400">You have no active ticket assignments.</p>
                    ) : (
                      agentTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="overflow-hidden pr-4">
                            <h3 className="text-sm font-bold text-slate-800 truncate">{ticket.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>From: {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
                              <span>•</span>
                              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-5 ${getPriorityBadgeClass(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Unassigned Pool */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">
                    Unassigned Pool (Top 5)
                  </h2>

                  <div className="space-y-3">
                    {unassignedTickets.length === 0 ? (
                      <p className="text-center py-8 text-sm text-slate-400">No unassigned tickets in queue.</p>
                    ) : (
                      unassignedTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="overflow-hidden pr-4">
                            <h3 className="text-sm font-bold text-slate-800 truncate">{ticket.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>From: {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
                              <span>•</span>
                              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-5 ${getPriorityBadgeClass(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Claim
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== CUSTOMER VIEW ==================== */}
          {isCustomer && (
            <div className="space-y-8">
              {/* Customer Stats Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {[
                  { name: "My Total Support Requests", value: customerStats?.totalTickets ?? 0, icon: Inbox, color: "text-blue-600 bg-blue-50" },
                  { name: "Active Tickets", value: customerStats?.openTickets ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
                  { name: "Resolved / Closed", value: customerStats?.closedTickets ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${stat.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</p>
                      </div>
                      <p className="mt-4 text-4xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Action Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 shrink-0" />
                    Need tech support or have an issue?
                  </h2>
                  <p className="text-brand-100 text-sm mt-1 max-w-md">
                    Open a new ticket detailing the problem and one of our support agents will pick it up shortly.
                  </p>
                </div>
                <Link
                  href="/tickets/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-600 hover:bg-brand-50 transition-colors shrink-0 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Submit New Ticket
                </Link>
              </div>

              {/* Recent Tickets list */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h2 className="text-lg font-bold text-slate-800">My Recent Requests</h2>
                  <Link href="/tickets" className="text-xs font-semibold text-brand-600 hover:underline">
                    View all my tickets
                  </Link>
                </div>

                <div className="space-y-3">
                  {customerTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium">You haven't submitted any tickets yet.</p>
                    </div>
                  ) : (
                    customerTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="overflow-hidden pr-4">
                          <h3 className="text-sm font-bold text-slate-800 truncate">{ticket.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Submitted on {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-5 ${getStatusBadgeClass(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Settings,
  Users,
  UserPlus,
  Building,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  UserX,
  UserCheck,
  ShieldCheck,
  Mail,
  ToggleLeft,
  ToggleRight,
  Plus,
  RefreshCw,
} from "lucide-react";

interface Member {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  businessId: string | null;
  isActive: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role?: {
    id: string;
    name: string;
    description: string;
  };
}

export default function SettingsPage() {
  const { user, activeOrg, activeOrgId, refreshOrgs, setOrg, roles, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"org" | "team" | "invite">("org");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for Org Settings
  const [orgName, setOrgName] = useState("");
  const [assignMethod, setAssignMethod] = useState<"AUTO" | "MANUAL">("MANUAL");

  // Team states
  const [members, setMembers] = useState<Member[]>([]);
  const [roleMap, setRoleMap] = useState<{ [name: string]: string }>({});

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("SUPPORT");
  const [inviteBusinessId, setInviteBusinessId] = useState("");

  // Businesses states
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessIndustry, setNewBusinessIndustry] = useState("");
  const [businessActionLoading, setBusinessActionLoading] = useState(false);

  // Pending invitations states
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsLimit] = useState(10);
  const [invitationsTotal, setInvitationsTotal] = useState(0);

  const isOwner = roles.includes("OWNER");
  const isOwnerAdmin = roles.includes("OWNER") || roles.includes("ADMIN");

  const loadBusinesses = async () => {
    if (!activeOrgId) return;
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

  const loadInvitations = async () => {
    if (!activeOrgId) return;
    setLoadingInvitations(true);
    try {
      const response = await apiClient.users.invitesList({
        page: invitationsPage,
        limit: invitationsLimit,
      });
      setInvitations(response.data || []);
      setInvitationsTotal(response.total || 0);
    } catch (err) {
      console.error("Failed to load invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName) return;
    setBusinessActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await apiClient.businesses.create({
        name: newBusinessName,
        industry: newBusinessIndustry || undefined,
      });
      setSuccessMsg(`Business "${newBusinessName}" created successfully!`);
      setNewBusinessName("");
      setNewBusinessIndustry("");
      setIsCreatingBusiness(false);
      
      // Auto-refresh the business list
      const updated = await apiClient.businesses.list({ limit: 100 });
      setBusinesses(updated.data || []);
      
      // Auto-select the newly created business
      if (response && response.id) {
        setInviteBusinessId(response.id);
      } else {
        const match = (updated.data || []).find((b: any) => b.name === newBusinessName);
        if (match) setInviteBusinessId(match.id);
      }
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to create business.");
    } finally {
      setBusinessActionLoading(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setActionLoading(invitationId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.users.resendInvite(invitationId);
      setSuccessMsg("Invitation resent successfully!");
      await loadInvitations();
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to resend invitation.");
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleName = (roleId: string) => {
    const entry = Object.entries(roleMap).find(([name, id]) => id === roleId);
    return entry ? entry[0] : "UNKNOWN";
  };

  const getBusinessName = (businessId: string | null) => {
    if (!businessId) return "N/A";
    const biz = businesses.find((b) => b.id === businessId);
    return biz ? biz.name : businessId.slice(0, 8) + "...";
  };

  const loadSettingsData = async () => {
    if (!activeOrgId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeOrg) {
        setOrgName(activeOrg.name);
        setAssignMethod(activeOrg.ticketAssignMethod);
      }

      if (isOwnerAdmin) {
        const membersData = await apiClient.users.organization();
        setMembers(membersData || []);

        // Resolve roles mapping dynamically from the members list
        const rolesFound: { [name: string]: string } = {};
        membersData.forEach((m: Member) => {
          if (m.role) {
            rolesFound[m.role.name] = m.role.id;
          }
        });
        setRoleMap(rolesFound);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load workspace settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrgId && !authLoading) {
      loadSettingsData();
    }
  }, [activeOrgId, authLoading]);

  useEffect(() => {
    if (activeOrgId && activeTab === "invite" && !authLoading) {
      loadBusinesses();
      loadInvitations();
    }
  }, [activeOrgId, activeTab, authLoading]);

  useEffect(() => {
    if (activeOrgId && activeTab === "invite" && !authLoading) {
      loadInvitations();
    }
  }, [invitationsPage]);

  // Handle Org settings save
  const handleSaveOrgSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    setActionLoading("org");
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Save assignment method
      const updatedOrg = await apiClient.organizations.updateTicketAssignment(activeOrgId, assignMethod);
      
      // If org name is changed (requires backend endpoint or updates active context)
      // For now, save ticket assign method
      if (activeOrg) {
        const newOrg = { ...activeOrg, ticketAssignMethod: assignMethod };
        setOrg(newOrg);
      }
      
      await refreshOrgs();
      setSuccessMsg("Organization settings updated successfully!");
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to update organization settings.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Member deactivation/activation
  const handleToggleStatus = async (memberId: string, userId: string, currentActive: boolean) => {
    setActionLoading(memberId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (currentActive) {
        await apiClient.users.deactivate(userId);
        setSuccessMsg("Team member deactivated successfully.");
      } else {
        await apiClient.users.activate(userId);
        setSuccessMsg("Team member activated successfully.");
      }
      await loadSettingsData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle member status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Member role update
  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.users.updateRole(userId, newRoleId);
      setSuccessMsg("Role updated successfully!");
      await loadSettingsData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update member role.");
    }
  };

  // Handle Member removal (soft delete)
  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the organization?")) return;
    setActionLoading(memberId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.users.delete(userId);
      setSuccessMsg("User removed from organization successfully.");
      await loadSettingsData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove member.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Invite Dispatch
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setActionLoading("invite");
    setErrorMsg(null);
    setSuccessMsg(null);

    // Resolve role ID based on the selection
    const targetRoleId = roleMap[inviteRole];
    if (!targetRoleId) {
      setErrorMsg(`Could not resolve role ID for ${inviteRole}. Make sure a member exists with this role.`);
      setActionLoading(null);
      return;
    }

    if (inviteRole === "CUSTOMER" && !inviteBusinessId) {
      setErrorMsg("When inviting a customer, you must select a business.");
      setActionLoading(null);
      return;
    }

    try {
      await apiClient.users.invite({
        email: inviteEmail,
        roleId: targetRoleId,
        businessId: inviteBusinessId || undefined,
      });

      setSuccessMsg(`Invitation dispatched to ${inviteEmail}!`);
      setInviteEmail("");
      setInviteBusinessId("");
      await loadInvitations();
    } catch (err: any) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message?.toString() || "Failed to send invitation.");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!isOwnerAdmin) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">
            Only owners and administrators can configure organization setting tabs.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Organization Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage workspace assignment methods, invite coworkers/customers, and modify team roles.
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200 flex gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar Tabs */}
        <div className="space-y-1">
          {[
            { id: "org", name: "Workspace Rules", icon: Building },
            { id: "team", name: "Manage Team Members", icon: Users },
            { id: "invite", name: "Invite Teammates", icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/10"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Configurations Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              {/* Tab 1: Org Settings */}
              {activeTab === "org" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-800">Workspace Configurations</h2>
                  <p className="text-slate-500 text-xs">
                    Define the name and routing rules for incoming customer tickets.
                  </p>

                  <form onSubmit={handleSaveOrgSettings} className="space-y-6 mt-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        disabled // Set disabled as org name changes aren't directly supported by workspace switch context APIs yet
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="block w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {isOwner && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 max-w-2xl space-y-4">
                        <h3 className="text-sm font-bold text-slate-700">Ticket Assignment Engine</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Choose whether new support requests are automatically assigned to staff or left unassigned.
                        </p>

                        <div className="flex items-center gap-6 mt-3">
                          <button
                            type="button"
                            onClick={() => setAssignMethod("MANUAL")}
                            className={`flex-1 flex items-center justify-between rounded-lg border p-4 text-left transition-all ${
                              assignMethod === "MANUAL"
                                ? "bg-white border-brand-500 text-brand-700 ring-1 ring-brand-500 shadow-sm"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold uppercase">Manual Routing</p>
                              <p className="text-[10px] text-slate-400 mt-1">Leave tickets in general queue</p>
                            </div>
                            {assignMethod === "MANUAL" ? (
                              <ToggleRight className="h-7 w-7 text-brand-600" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-slate-300" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setAssignMethod("AUTO")}
                            className={`flex-1 flex items-center justify-between rounded-lg border p-4 text-left transition-all ${
                              assignMethod === "AUTO"
                                ? "bg-white border-brand-500 text-brand-700 ring-1 ring-brand-500 shadow-sm"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold uppercase">Auto Assignment</p>
                              <p className="text-[10px] text-slate-400 mt-1">Assign to agent with lowest queue count</p>
                            </div>
                            {assignMethod === "AUTO" ? (
                              <ToggleRight className="h-7 w-7 text-brand-600" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-slate-300" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {isOwner && (
                      <button
                        type="submit"
                        disabled={actionLoading === "org"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors"
                      >
                        {actionLoading === "org" && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Configurations
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Tab 2: Manage Team */}
              {activeTab === "team" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-800">Workspace Members</h2>
                  <p className="text-slate-500 text-xs">
                    View active memberships, update role scopes, or deactivate accounts.
                  </p>

                  <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {members.map((m) => {
                          const isSelf = m.userId === user?.id;
                          const isOrgOwner = m.role?.name === "OWNER";
                          const isPendingToggle = actionLoading === m.id;

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3.5">
                                <p className="font-semibold text-slate-800">
                                  {m.user?.firstName} {m.user?.lastName}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{m.user?.email}</p>
                              </td>

                              <td className="px-4 py-3.5">
                                {isSelf || isOrgOwner || !isOwner ? (
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                                    {m.role?.name}
                                  </span>
                                ) : (
                                  <select
                                    value={m.roleId}
                                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                                    className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 outline-none bg-white focus:border-brand-500"
                                  >
                                    {Object.entries(roleMap).map(([name, id]) => (
                                      <option key={id} value={id}>
                                        {name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold leading-5 ${
                                    m.isActive
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  {m.isActive ? "Active" : "Deactivated"}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right space-x-2">
                                {/* Toggle Deactivation */}
                                {!isSelf && !isOrgOwner && (
                                  <button
                                    onClick={() => handleToggleStatus(m.id, m.userId, m.isActive)}
                                    disabled={isPendingToggle}
                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                      m.isActive
                                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        : "bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100"
                                    }`}
                                  >
                                    {isPendingToggle ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : m.isActive ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5 shrink-0" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Remove Member */}
                                {!isSelf && !isOrgOwner && (
                                  <button
                                    onClick={() => handleRemoveMember(m.id, m.userId)}
                                    disabled={isPendingToggle}
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Invite User */}
              {activeTab === "invite" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-800">Invite a Member</h2>
                  <p className="text-slate-500 text-xs">
                    Send an onboarding email link to coworkers or customer users.
                  </p>

                  <form onSubmit={handleInviteSubmit} className="space-y-5 max-w-md mt-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Invitee Email Address
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="coworker@company.com"
                          className="block w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Role Assignment
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => {
                          setInviteRole(e.target.value);
                          if (e.target.value !== "CUSTOMER") {
                            setInviteBusinessId("");
                          }
                        }}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none bg-white font-semibold text-slate-700 focus:border-brand-500 transition-colors"
                      >
                        <option value="ADMIN">ADMIN (Workspace Co-Admin)</option>
                        <option value="SUPPORT">SUPPORT (Support Agent)</option>
                        <option value="CUSTOMER">CUSTOMER (Client / End User)</option>
                      </select>
                    </div>

                    {inviteRole === "CUSTOMER" && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                          B2B Business Context (Required)
                        </label>
                        {loadingBusinesses ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 py-2.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading businesses...
                          </div>
                        ) : (
                          <>
                            <select
                              value={inviteBusinessId}
                              required
                              onChange={(e) => setInviteBusinessId(e.target.value)}
                              className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none bg-white font-semibold text-slate-700 focus:border-brand-500 transition-colors"
                            >
                              <option value="">Select a Business</option>
                              {businesses.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} {b.industry ? `(${b.industry})` : ""}
                                </option>
                              ))}
                            </select>

                            <div className="flex justify-between items-center mt-1">
                              <button
                                type="button"
                                onClick={() => setIsCreatingBusiness(!isCreatingBusiness)}
                                className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {isCreatingBusiness ? "Cancel new business" : "Create new business"}
                              </button>
                              <button
                                type="button"
                                onClick={loadBusinesses}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className={`h-3 w-3 ${loadingBusinesses ? "animate-spin" : ""}`} />
                                Refresh list
                              </button>
                            </div>

                            {isCreatingBusiness && (
                              <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                <p className="text-xs font-bold text-slate-700">Register New Business</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                      Business Name
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Acme Inc."
                                      value={newBusinessName}
                                      onChange={(e) => setNewBusinessName(e.target.value)}
                                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                      Industry (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Technology"
                                      value={newBusinessIndustry}
                                      onChange={(e) => setNewBusinessIndustry(e.target.value)}
                                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 transition-colors"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCreatingBusiness(false);
                                      setNewBusinessName("");
                                      setNewBusinessIndustry("");
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={businessActionLoading || !newBusinessName}
                                    onClick={handleCreateBusinessSubmit}
                                    className="px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                  >
                                    {businessActionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save Business
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading === "invite"}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/10 hover:bg-brand-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading === "invite" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4.5 w-4.5" />
                          Dispatch Invitation
                        </>
                      )}
                    </button>
                  </form>

                  {/* Pending Invitations Section */}
                  <div className="pt-8 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Pending & Sent Invitations</h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Track and resend onboarding links dispatched to your workspace members.
                    </p>

                    {loadingInvitations ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                      </div>
                    ) : invitations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl mt-4">
                        No invitations found.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                                <th className="px-4 py-3">Invitee Email</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Business Scope</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                              {invitations.map((inv) => {
                                const isPendingResend = actionLoading === inv.id;
                                const isAccepted = inv.status === "ACCEPTED";
                                return (
                                  <tr key={inv.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3.5 font-medium text-slate-800">
                                      {inv.email}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span className="text-xs font-semibold text-slate-600">
                                        {getRoleName(inv.roleId)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs text-slate-500">
                                      {getBusinessName(inv.businessId)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold leading-5 border ${
                                          inv.status === "ACCEPTED"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : inv.status === "PENDING"
                                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                        }`}
                                      >
                                        {inv.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                      <button
                                        type="button"
                                        disabled={isAccepted || isPendingResend}
                                        onClick={() => handleResendInvite(inv.id)}
                                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                          isAccepted
                                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                        }`}
                                      >
                                        {isPendingResend ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                        Resend
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {invitationsTotal > invitationsLimit && (
                          <div className="flex justify-between items-center px-2 py-1 text-xs text-slate-500">
                            <span>
                              Showing page {invitationsPage} of {Math.ceil(invitationsTotal / invitationsLimit)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={invitationsPage <= 1}
                                onClick={() => setInvitationsPage(invitationsPage - 1)}
                                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600 transition-colors cursor-pointer"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                disabled={invitationsPage >= Math.ceil(invitationsTotal / invitationsLimit)}
                                onClick={() => setInvitationsPage(invitationsPage + 1)}
                                className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600 transition-colors cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

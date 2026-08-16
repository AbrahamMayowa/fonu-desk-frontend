"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Building, Plus, ArrowRight, LogOut, Loader2, ShieldCheck } from "lucide-react";

export default function SelectOrganizationPage() {
  const { user, organizations, switchOrg, logout, isLoading } = useAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSelect = async (orgId: string) => {
    setSwitchingId(orgId);
    try {
      await switchOrg(orgId);
    } catch (err) {
      console.error(err);
      setSwitchingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white p-8 sm:p-10 rounded-2xl">
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
            Select your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Choose an organization to open your support dashboard
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Signed In As</p>
            <p className="text-sm font-semibold text-slate-700 truncate">
              {user?.firstName} {user?.lastName} ({user?.email})
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Switch Account
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {organizations.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              You are not a member of any workspaces yet.
            </div>
          ) : (
            organizations.map((org) => {
              const isSwitching = switchingId === org.id;
              const isOwnerOfOrg = org.ownerId === user?.id;

              return (
                <button
                  key={org.id}
                  disabled={switchingId !== null}
                  onClick={() => handleSelect(org.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-500 hover:shadow-md hover:shadow-slate-100 disabled:opacity-60 group focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{org.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        {isOwnerOfOrg ? (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                            Owner
                          </>
                        ) : (
                          "Teammate / Member"
                        )}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isSwitching ? (
                      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                    ) : (
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {user?.isOwner && (
          <div className="border-t border-slate-100 pt-6">
            <Link
              href="/create-organization"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-950/10"
            >
              <Plus className="h-4 w-4" />
              Create New Organization
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

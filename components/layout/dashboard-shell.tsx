"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, Organization } from "@/context/auth-context";
import { apiClient } from "@/lib/api";
import {
  LayoutDashboard,
  Ticket,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Plus,
  Check,
  Building,
  User,
  Shield,
  CircleAlert,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  ticketId: string | null;
  type: string | null;
  createdAt: string;
}

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    logout,
    activeOrgId,
    activeOrg,
    organizations,
    switchOrg,
    roles,
  } = useAuth();

  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const orgRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!activeOrgId) return;
    try {
      const response = await apiClient.notifications.list({ page: 1, limit: 10 });
      const notifs = response.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: NotificationItem) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // Poll every 45s
    return () => clearInterval(interval);
  }, [activeOrgId]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, ticketId: string | null) => {
    try {
      await apiClient.notifications.read([id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsNotifDropdownOpen(false);
      if (ticketId) {
        router.push(`/tickets/${ticketId}`);
      }
    } catch (err) {
      console.error("Failed to read notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await apiClient.notifications.read(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to read all notifications:", err);
    }
  };

  const hasAccessToSettings = roles.includes("OWNER") || roles.includes("ADMIN");

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tickets", href: "/tickets", icon: Ticket },
    ...(hasAccessToSettings
      ? [{ name: "Settings", href: "/settings", icon: Settings }]
      : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/fonu-desk-logo-text.svg"
              alt="Fonu Desk Logo"
              width={140}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <button
            className="rounded p-1 hover:bg-slate-800 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white uppercase shadow-inner">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white leading-5">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-slate-500 leading-4">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-30">
          {/* Left: Mobile Toggle & Active Org switcher */}
          <div className="flex items-center gap-4">
            <button
              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Organization Switcher Dropdown */}
            <div className="relative" ref={orgRef}>
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <Building className="h-4 w-4 text-slate-400" />
                <span className="max-w-[140px] truncate">
                  {activeOrg ? activeOrg.name : "Select Organization"}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 origin-top-left rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    My Workspaces
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {organizations.map((org) => {
                      const isSelected = org.id === activeOrgId;
                      return (
                        <button
                          key={org.id}
                          onClick={() => {
                            setIsOrgDropdownOpen(false);
                            if (!isSelected) switchOrg(org.id);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-brand-50 text-brand-600"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{org.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>

                  {user?.isOwner && (
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <Link
                        href="/create-organization"
                        onClick={() => setIsOrgDropdownOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Create Organization
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Role scope indicator */}
            {roles.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                <Shield className="h-3 w-3 text-slate-400" />
                {roles[0]}
              </span>
            )}
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 z-50">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-bold text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <CircleAlert className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No alerts found</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id, notif.ticketId)}
                          className={`flex cursor-pointer gap-2 p-4 text-left transition-colors hover:bg-slate-50 ${
                            !notif.isRead ? "bg-slate-50/60 font-medium" : ""
                          }`}
                        >
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center justify-between mb-1">
                              <p className="truncate text-xs font-bold text-slate-800 leading-4">
                                {notif.title}
                              </p>
                              {!notif.isRead && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed mb-1.5">
                              {notif.content}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-slate-100 transition-colors focus:outline-none"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 uppercase">
                  {user?.firstName?.[0]}
                </div>
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Panel Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

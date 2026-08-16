import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface AttachmentItem {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface InvitationItem {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  businessId?: string | null;
  token?: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  role?: Role;
}

// In-memory caching for dashboards
interface CacheEntry {
  data: any;
  timestamp: number;
}

let dashboardCache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds

export function clearDashboardCache() {
  dashboardCache = {};
}

// Fetch helper that appends token, handles JSON parsing, and parses errors
async function request<T>(
  path: string,
  options: RequestInit = {},
  bypassCache = false
): Promise<T> {
  const token = Cookies.get("accessToken");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const isGet = options.method === "GET" || !options.method;
  const isDashboard = path.startsWith("/dashboards");

  // Check cache for dashboard GET requests
  if (isGet && isDashboard && !bypassCache) {
    const cached = dashboardCache[path];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data as T;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth")) {
      Cookies.remove("accessToken");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    let errBody: any;
    try {
      errBody = await response.json();
    } catch {
      throw {
        statusCode: response.status,
        message: "An unexpected error occurred",
        error: response.statusText,
      } as ApiError;
    }
    throw errBody as ApiError;
  }

  // Handle empty or 204 responses
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  // Save to cache for dashboard GET requests
  if (isGet && isDashboard) {
    dashboardCache[path] = {
      data,
      timestamp: Date.now(),
    };
  }

  return data as T;
}

export const apiClient = {
  auth: {
    signup(payload: { firstName: string; lastName: string; email: string }) {
      return request<{ message: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    verifyEmail(payload: { email: string; code: string; password: string }) {
      return request<{
        message: string;
        accessToken?: string;
        user?: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          isOwner: boolean;
          defaultOrganizationId: string | null;
        };
      }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    resendOtp(payload: { email: string }) {
      return request<{ message: string }>("/auth/resend-verification-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    login(payload: any) {
      return request<{
        accessToken: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          isOwner: boolean;
          defaultOrganizationId: string | null;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    switchOrganization(payload: { organizationId: string }) {
      return request<{ accessToken: string }>("/auth/switch-organization", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    forgotPassword(email: string) {
      return request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    changePassword(payload: { email: string; code: string; newPassword: string }) {
      return request<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  users: {
    roles() {
      return request<Role[]>("/users/roles");
    },
    me() {
      return request<any>("/users/me");
    },
    organization() {
      return request<any[]>("/users/organization");
    },
    business(businessId: string) {
      return request<any[]>(`/users/business/${businessId}`);
    },
    customers(businessId?: string) {
      const qs = businessId ? `?businessId=${businessId}` : "";
      return request<any[]>(`/users/customers${qs}`);
    },
    invite(payload: { email: string; roleId: string; businessId?: string }) {
      return request<{ message: string; invitationId: string }>("/users/invite", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    acceptInvite(payload: any) {
      return request<{
        message: string;
        accessToken?: string;
        user?: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          isOwner: boolean;
          defaultOrganizationId: string | null;
        };
      }>("/users/accept-invite", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    delete(id: string) {
      return request<{ message: string }>(`/users/${id}`, {
        method: "DELETE",
      });
    },
    activate(id: string) {
      return request<{ message: string }>(`/users/${id}/activate`, {
        method: "PATCH",
      });
    },
    deactivate(id: string) {
      return request<{ message: string }>(`/users/${id}/deactivate`, {
        method: "PATCH",
      });
    },
    updateRole(id: string, roleId: string) {
      return request<{ message: string }>(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ roleId }),
      });
    },
    invitesList(params?: { page?: number; limit?: number }) {
      const qs = new URLSearchParams();
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<{ data: InvitationItem[]; total: number }>("/users/invites" + query);
    },
    resendInvite(id: string) {
      return request<{ message: string; invitationId: string }>(`/users/invites/${id}/resend`, {
        method: "POST",
      });
    },
  },

  organizations: {
    create(payload: { name: string }) {
      return request<any>("/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    userMe() {
      return request<{ organizations: any[] }>("/organizations/user/me");
    },
    list(params?: { page?: number; limit?: number; search?: string }) {
      const qs = new URLSearchParams();
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      if (params?.search) qs.append("search", params.search);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<any>(`/organizations${query}`);
    },
    updateTicketAssignment(id: string, method: "AUTO" | "MANUAL") {
      return request<any>(`/organizations/${id}/ticket-assignment`, {
        method: "PATCH",
        body: JSON.stringify({ method }),
      });
    },
  },

  businesses: {
    list(params?: { search?: string; page?: number; limit?: number }) {
      const qs = new URLSearchParams();
      if (params?.search) qs.append("search", params.search);
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<{ data: any[]; total: number; page: number; limit: number }>(`/businesses${query}`);
    },
    create(payload: { name: string; industry?: string }) {
      return request<any>("/businesses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  tickets: {
    uploadImage(base64Image: string) {
      return request<{ fileUrl: string; fileName: string }>(
        "/tickets/upload-image",
        {
          method: "POST",
          body: JSON.stringify({ base64Image }),
        }
      );
    },
    create(payload: {
      title: string;
      description: string;
      priority?: string;
      businessId?: string;
      attachments?: AttachmentItem[];
      attachment?: AttachmentItem;
    }) {
      return request<any>("/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    createOnBehalf(payload: {
      title: string;
      description: string;
      customerId: string;
      priority?: string;
      businessId?: string;
      attachments?: AttachmentItem[];
      attachment?: AttachmentItem;
    }) {
      return request<any>("/tickets/on-behalf", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    list(params?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      search?: string;
    }) {
      const qs = new URLSearchParams();
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      if (params?.status && params.status !== "ALL") qs.append("status", params.status);
      if (params?.priority && params.priority !== "ALL") qs.append("priority", params.priority);
      if (params?.search) qs.append("search", params.search);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<{ data: any[]; total: number; page: number; limit: number }>(
        `/tickets${query}`
      );
    },
    get(id: string) {
      return request<any>(`/tickets/${id}`);
    },
    update(id: string, payload: { status?: string; priority?: string }) {
      return request<{ message: string }>(`/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    assign(id: string, assignedToId: string | null) {
      return request<{ message: string }>(`/tickets/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedToId }),
      });
    },
    addComment(id: string, payload: { content: string; isInternal: boolean }) {
      return request<any>(`/tickets/${id}/comments`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getComments(id: string) {
      return request<any[]>(`/tickets/${id}/comments`);
    },
    getHistory(id: string) {
      return request<any[]>(`/tickets/${id}/history`);
    },
    attachments(id: string) {
      return request<AttachmentItem[]>(`/tickets/${id}/attachments`);
    },
    mute(id: string) {
      return request<{ message: string }>(`/tickets/${id}/mute`, {
        method: "POST",
      });
    },
    unmute(id: string) {
      return request<{ message: string }>(`/tickets/${id}/unmute`, {
        method: "POST",
      });
    },
  },

  dashboards: {
    admin: {
      stats(bypassCache = false) {
        return request<any>("/dashboards/admin/stats", {}, bypassCache);
      },
      recentTickets(bypassCache = false) {
        return request<any>("/dashboards/admin/recent-tickets", {}, bypassCache);
      },
      recentActivity(bypassCache = false) {
        return request<any>("/dashboards/admin/recent-activity", {}, bypassCache);
      },
    },
    agent: {
      stats(bypassCache = false) {
        return request<any>("/dashboards/agent/stats", {}, bypassCache);
      },
      myTickets(bypassCache = false) {
        return request<any>("/dashboards/agent/my-tickets", {}, bypassCache);
      },
      unassignedTickets(bypassCache = false) {
        return request<any>("/dashboards/agent/unassigned-tickets", {}, bypassCache);
      },
    },
    customer: {
      stats(bypassCache = false) {
        return request<any>("/dashboards/customer/stats", {}, bypassCache);
      },
      recentTickets(bypassCache = false) {
        return request<any>("/dashboards/customer/recent-tickets", {}, bypassCache);
      },
    },
  },

  auditLogs: {
    list(params?: {
      page?: number;
      limit?: number;
      search?: string;
      entityType?: string;
      action?: string;
    }) {
      const qs = new URLSearchParams();
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      if (params?.search) qs.append("search", params.search);
      if (params?.entityType) qs.append("entityType", params.entityType);
      if (params?.action) qs.append("action", params.action);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<any>(`/audit-logs${query}`);
    },
  },

  notifications: {
    list(params?: { page?: number; limit?: number }) {
      const qs = new URLSearchParams();
      if (params?.page) qs.append("page", params.page.toString());
      if (params?.limit) qs.append("limit", params.limit.toString());
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return request<{ data: any[]; meta: any }>(`/notifications${query}`);
    },
    read(notificationIds: string[]) {
      return request<{ message: string }>("/notifications/read", {
        method: "PATCH",
        body: JSON.stringify({ notificationIds }),
      });
    },
  },
};

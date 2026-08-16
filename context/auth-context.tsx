"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import { apiClient, clearDashboardCache } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isOwner: boolean;
}

export interface DecodedToken {
  id: string;
  email: string;
  roles: string[];
  isOwner: boolean;
  organizationId: string | null;
  exp: number;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  ticketAssignMethod: "AUTO" | "MANUAL";
  createdAt: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  roles: string[];
  activeOrgId: string | null;
  activeOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshOrgs: () => Promise<void>;
  setOrg: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): DecodedToken | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const router = useRouter();
  const pathname = usePathname();

  const handleLogoutState = () => {
    Cookies.remove("accessToken");
    setUser(null);
    setToken(null);
    setRoles([]);
    setActiveOrgId(null);
    setActiveOrg(null);
    setOrganizations([]);
    clearDashboardCache();
  };

  const loadSession = async () => {
    const currentToken = Cookies.get("accessToken");
    if (!currentToken) {
      handleLogoutState();
      setIsLoading(false);
      return;
    }

    try {
      setToken(currentToken);
      const decoded = parseJwt(currentToken);
      if (!decoded) {
        throw new Error("Invalid JWT");
      }

      // Check expiry
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      setActiveOrgId(decoded.organizationId);
      setRoles(decoded.roles || []);

      // Parallel fetch user details and their organizations
      const [profileData, orgsResponse] = await Promise.all([
        apiClient.users.me(),
        apiClient.organizations.userMe(),
      ]);

      setUser(profileData);
      const orgList = orgsResponse.organizations || [];
      setOrganizations(orgList);

      const activeId = decoded.organizationId;
      if (activeId) {
        const foundOrg = orgList.find((org: Organization) => org.id === activeId);
        if (foundOrg) {
          setActiveOrg(foundOrg);
        } else {
          setActiveOrg(null);
        }
      } else {
        setActiveOrg(null);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      handleLogoutState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  // Protect client side routes
  useEffect(() => {
    if (isLoading) return;

    const publicRoutes = ["/login", "/signup", "/verify-email", "/invite"];
    const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

    if (!token && !isPublic) {
      router.push("/login");
    } else if (token && isPublic) {
      if (organizations.length === 0 && user?.isOwner) {
        router.push("/create-organization");
      } else {
        router.push("/dashboard");
      }
    } else if (token && !isPublic) {
      // Check org context requirements
      if (organizations.length === 0 && pathname !== "/create-organization" && user?.isOwner) {
        router.push("/create-organization");
      } else if (organizations.length > 0 && !activeOrgId && pathname !== "/select-organization") {
        router.push("/select-organization");
      }
    }
  }, [token, pathname, isLoading, organizations, activeOrgId, user]);

  const login = async (newToken: string, profile: UserProfile) => {
    Cookies.set("accessToken", newToken, { expires: 7 }); // Store token in cookies for 7 days
    setToken(newToken);
    setUser(profile);

    const decoded = parseJwt(newToken);
    const targetOrgId = decoded?.organizationId || null;
    setActiveOrgId(targetOrgId);
    setRoles(decoded?.roles || []);

    try {
      const orgsResponse = await apiClient.organizations.userMe();
      const orgList = orgsResponse.organizations || [];
      setOrganizations(orgList);

      if (targetOrgId) {
        const found = orgList.find((o) => o.id === targetOrgId);
        if (found) setActiveOrg(found);
      }

      if (orgList.length === 0) {
        if (profile.isOwner) {
          router.push("/create-organization");
        } else {
          // Invited user without memberships? Should not happen standardly, but handle it
          router.push("/login");
        }
      } else if (orgList.length === 1) {
        // Automatically switch organization to lock-in the token scope
        const singleOrg = orgList[0];
        if (targetOrgId === singleOrg.id) {
          router.push("/dashboard");
        } else {
          await switchOrg(singleOrg.id);
        }
      } else {
        router.push("/select-organization");
      }
    } catch (e) {
      console.error("Login navigation failed:", e);
      router.push("/select-organization");
    }
  };

  const logout = () => {
    handleLogoutState();
    router.push("/login");
  };

  const switchOrg = async (orgId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.auth.switchOrganization({ organizationId: orgId });
      Cookies.set("accessToken", response.accessToken, { expires: 7 });
      clearDashboardCache();
      
      // Perform a clean reload of application state to prevent any data leak
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to switch workspace context:", err);
      setIsLoading(false);
      throw err;
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await apiClient.users.me();
      setUser(profile);
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  const refreshOrgs = async () => {
    try {
      const orgsResponse = await apiClient.organizations.userMe();
      setOrganizations(orgsResponse.organizations || []);
    } catch (e) {
      console.error("Failed to refresh organizations:", e);
    }
  };

  const setOrg = (org: Organization) => {
    setActiveOrg(org);
    setActiveOrgId(org.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        roles,
        activeOrgId,
        activeOrg,
        organizations,
        isLoading,
        login,
        logout,
        switchOrg,
        refreshProfile,
        refreshOrgs,
        setOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

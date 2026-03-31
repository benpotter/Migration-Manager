import { UserProfile } from "@/types";

const ALLOWED_DOMAINS = ["madcollective.com", "roguecc.edu"];

// Emails that should automatically be assigned the admin role
const ADMIN_EMAILS = ["ben@madcollective.com"];

export function isAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "admin" || isAdminEmail(user.email);
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getRoleForEmail(email: string): "admin" | "viewer" {
  return isAdminEmail(email) ? "admin" : "viewer";
}

export function isEditor(user: UserProfile | null): boolean {
  return user?.role === "editor";
}

export function canEdit(user: UserProfile | null): boolean {
  return user?.role === "admin" || user?.role === "editor";
}

export function isAllowedDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

const SUPERADMIN_DOMAINS = ["madcollective.com"];

export function isSuperadminDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return SUPERADMIN_DOMAINS.includes(domain);
}

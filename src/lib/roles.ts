/**
 * Roles: OWNER / ADMIN / MEMBER
 * OWNER: full access including org settings, delete, audit
 * ADMIN: manage leads, campaigns, imports, outcomes
 * MEMBER: view and contact, cannot delete org or manage members
 */

export type Role = "OWNER" | "ADMIN" | "MEMBER";

const PERMISSIONS: Record<Role, string[]> = {
  OWNER: ["org:manage", "member:manage", "lead:read", "lead:write", "lead:delete", "campaign:manage", "import:run", "audit:read", "outcome:write"],
  ADMIN: ["lead:read", "lead:write", "campaign:manage", "import:run", "audit:read", "outcome:write"],
  MEMBER: ["lead:read", "lead:write", "campaign:read", "import:read", "outcome:write"],
};

export function hasPermission(role: string, permission: string): boolean {
  const normalized = role.toUpperCase() as Role;
  const perms = PERMISSIONS[normalized] || PERMISSIONS.MEMBER;
  return perms.includes(permission) || perms.includes("*");
}

export function canManageOrg(role: string): boolean {
  return role.toUpperCase() === "OWNER";
}

export function canDelete(role: string): boolean {
  const r = role.toUpperCase();
  return r === "OWNER" || r === "ADMIN";
}

export function canManageCampaigns(role: string): boolean {
  return hasPermission(role, "campaign:manage");
}

export function canImport(role: string): boolean {
  return hasPermission(role, "import:run") || hasPermission(role, "import:read");
}

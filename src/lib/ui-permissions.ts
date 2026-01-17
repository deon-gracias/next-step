// lib/ui-permissions.ts
import type { roles } from "@/lib/permissions";

export type AppRole = (typeof roles)[number]["label"];

export type UIPermission =
  | "users.view"
  | "users.manage"
  | "templates.view"
  | "templates.manage"
  | "facilities.view"
  | "facilities.manage"
  | "residents.view"
  | "residents.manage"
  | "ftags.view" // ✅ ADD THIS
  | "ftags.manage"
  | "surveys.view"
  | "surveys.manage"
  | "surveys.lockUnlock"
  | "surveys.generatePoc"
  | "poc.view"
  | "poc.edit"
  | "compliance.view"
  | "compliance.manage"
  | "analytics.view";

const rolePerms: Record<AppRole, Set<UIPermission>> = {
  admin: new Set([
    "users.view",
    "users.manage",
    "templates.view",
    "templates.manage",
    "facilities.view",
    "facilities.manage",
    "residents.view",
    "residents.manage",
    "ftags.view",
    "ftags.manage",
    "surveys.view",
    "surveys.manage",
    "surveys.lockUnlock",
    "surveys.generatePoc",
    "poc.view",
    "poc.edit",
    "compliance.view",
    "compliance.manage",
    "analytics.view",
  ]),
  viewer: new Set([
    "users.view",
    "templates.view",
    "facilities.view",
    "residents.view",
    "surveys.view",
    "poc.view",
    "ftags.view",
    "compliance.view",
    "analytics.view",
  ]),
  lead_surveyor: new Set([
    "users.view",
    "facilities.view",
    "templates.view",
    "residents.view",
    "residents.manage",
    "ftags.view",
    "surveys.view",
    "surveys.manage",
    "surveys.lockUnlock",
    "surveys.generatePoc",
    "poc.view",
    "analytics.view",
  ]),
  surveyor: new Set([
    "ftags.view",
    "surveys.view",
    "surveys.manage",
    "poc.view",
    "compliance.view",
    "analytics.view",
  ]),
  facility_coordinator: new Set([
    "ftags.view",
    "templates.view",
    "surveys.view",
    "poc.view",
    "poc.edit",
    "compliance.view",
    "compliance.manage",
    "analytics.view",
  ]),
  facility_viewer: new Set([
    "templates.view",
    "ftags.view",
    "surveys.view",
    "poc.view",
    "compliance.view",
    "analytics.view",
  ]),
};

export function canUI(role: AppRole | null | undefined, perm: UIPermission) {
  if (!role) return false;
  return rolePerms[role]?.has(perm) ?? false;
}

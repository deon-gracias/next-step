import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const roles = [
  { label: "admin" },
  { label: "viewer" },
  { label: "surveyor" },
] as const;

/* 1️⃣  Extend the default resources  */
export const ac = createAccessControl({
  ...defaultStatements,
  template: ["create", "update", "delete", "read"] as const,
  facility: ["create", "update", "delete", "read"] as const,
  resident: ["create", "update", "delete", "read"] as const,
  question: ["create", "update", "delete", "read"] as const,
  survey: ["create", "update", "delete", "read"],
} as const);

export const owner = ac.newRole({});

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  template: ["create", "update", "delete", "read"],
  facility: ["create", "update", "delete", "read"],
  resident: ["create", "update", "delete", "read"],
  question: ["create", "update", "delete", "read"],
  survey: ["create", "update", "delete", "read"],
});

export const viewer = ac.newRole({
  member: [],
});

export const surveyor = ac.newRole({});

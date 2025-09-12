// lib/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const roles = [
  { label: "admin" },
  { label: "viewer" },
  { label: "lead_surveyor" },
  { label: "surveyor" },
  { label: "facility_coordinator" },
  { label: "facility_viewer"}
] as const;

/* Extend org resources, including POC */
export const ac = createAccessControl({
  ...defaultStatements,
  template: ["create", "update", "delete", "read"] as const,
  facility: ["create", "update", "delete", "read"] as const,
  resident: ["create", "update", "delete", "read"] as const,
  question: ["create", "update", "delete", "read"] as const,
  survey: ["create", "update", "delete", "read"] as const,
  poc: ["create", "update", "delete", "read"] as const,
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
  poc: ["create", "update", "delete", "read"],
});

export const viewer = ac.newRole({
  template: ["read"],
  facility: ["read"],
  resident: ["read"],
  question: ["read"],
  survey: ["read"],
  poc: ["read"],
});

export const surveyor = ac.newRole({
  survey: ["read", "update"],
  poc: ["read"],
});

export const lead_surveyor = ac.newRole({
  survey: ["create", "update", "delete", "read"],
  poc: ["read"],
});

export const facility_coordinator = ac.newRole({
  survey: ["read", "update"],
  poc: ["create", "update", "delete", "read"],
});

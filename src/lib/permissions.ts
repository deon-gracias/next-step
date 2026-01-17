// // lib/permissions.ts
// import { createAccessControl } from "better-auth/plugins/access";
// import { defaultStatements } from "better-auth/plugins/organization/access";

// export const roles = [
//   { label: "admin" },
//   { label: "viewer" },
//   { label: "lead_surveyor" },
//   { label: "surveyor" },
//   { label: "facility_coordinator" },
//   { label: "facility_viewer"}
// ] as const;

// /* Extend org resources, including POC */
// export const ac = createAccessControl({
//   ...defaultStatements,
//   template: ["create", "update", "delete", "read"] as const,
//   facility: ["create", "update", "delete", "read"] as const,
//   resident: ["create", "update", "delete", "read"] as const,
//   question: ["create", "update", "delete", "read"] as const,
//   survey: ["create", "update", "delete", "read"] as const,
//   poc: ["create", "update", "delete", "read"] as const,
// } as const);

// export const owner = ac.newRole({});

// export const admin = ac.newRole({
//   organization: ["update"],
//   member: ["create", "update", "delete"],
//   invitation: ["create", "cancel"],
//   template: ["create", "update", "delete", "read"],
//   facility: ["create", "update", "delete", "read"],
//   resident: ["create", "update", "delete", "read"],
//   question: ["create", "update", "delete", "read"],
//   survey: ["create", "update", "delete", "read"],
//   poc: ["create", "update", "delete", "read"],
// });

// export const viewer = ac.newRole({
//   template: ["read"],
//   facility: ["read"],
//   resident: ["read"],
//   question: ["read"],
//   survey: ["read"],
//   poc: ["read"],
// });

// export const surveyor = ac.newRole({
//   survey: ["read", "update"],
//   poc: ["read"],
// });

// export const lead_surveyor = ac.newRole({
//   survey: ["create", "update", "delete", "read"],
//   poc: ["read"],
// });

// export const facility_coordinator = ac.newRole({
//   survey: ["read", "update"],
//   poc: ["create", "update", "delete", "read"],
// });

// lib/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements as organizationDefaultStatements } from "better-auth/plugins/organization/access";
import {
  defaultStatements as adminDefaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";

export const roles = [
  { label: "admin" },
  { label: "viewer" },
  { label: "lead_surveyor" },
  { label: "surveyor" },
  { label: "facility_coordinator" },
  { label: "facility_viewer" },
] as const;

export const ac = createAccessControl({
  ...organizationDefaultStatements,
  template: ["create", "update", "delete", "read"] as const,
  facility: ["create", "update", "delete", "read"] as const,
  resident: ["create", "update", "delete", "read"] as const,
  survey: ["create", "update", "delete", "read"] as const,
  poc: ["create", "update", "delete", "read"] as const,
  compliance: ["create", "update", "delete", "read"] as const,
  analytics: ["read"] as const,
  ...adminDefaultStatements,
} as const);

// Keep if you use owner anywhere
export const owner = ac.newRole({});

export const admin = ac.newRole({
  member: ["update", "create", "delete"],
  organization: ["update", "delete"],
  invitation: ["create", "cancel"],
  template: ["create", "update", "delete", "read"],
  facility: ["create", "update", "delete", "read"],
  resident: ["create", "update", "delete", "read"],
  survey: ["create", "update", "delete", "read"],
  poc: ["create", "update", "delete", "read"],
  compliance: ["create", "update", "delete", "read"],
  analytics: ["read"],
});

export const viewer = ac.newRole({
  template: ["read"],
  facility: ["read"],
  resident: ["read"],
  survey: ["read"],
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});

export const lead_surveyor = ac.newRole({
  facility: ["read"],
  resident: ["create", "update", "read"],
  survey: ["create", "update", "read"],
  poc: ["update", "read"],
  analytics: ["read"],
  compliance: ["read"],
});

export const surveyor = ac.newRole({
  survey: ["update", "read"],
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});

export const facility_coordinator = ac.newRole({
  template: ["read"],
  survey: ["read"],
  poc: ["update", "read", "create"],
  compliance: ["create", "update", "read"],
  analytics: ["read"],
});

export const facility_viewer = ac.newRole({
  template: ["read"],
  survey: ["read"],
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});

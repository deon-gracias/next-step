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
import { defaultStatements } from "better-auth/plugins/organization/access";

export const roles = [
  { label: "admin" },
  { label: "viewer" },
  { label: "lead_surveyor" },
  { label: "surveyor" },
  { label: "facility_coordinator" },
  { label: "facility_viewer" },
] as const;

export const ac = createAccessControl({
  // Better Auth organization plugin statements (IMPORTANT: no "read" here)
  ...defaultStatements,

  // App resources (these DO support read)
  user: ["read"] as const, // "Viewing Users" permission for your app pages/APIs

  template: ["create", "update", "delete", "read"] as const,
  facility: ["create", "update", "delete", "read"] as const,
  resident: ["create", "update", "delete", "read"] as const,

  // Surveys include: manage, view, lock/unlock, edit findings, generate POC (these are all "survey.update"/"survey.create" etc in your app)
  survey: ["create", "update", "delete", "read"] as const,

  // Plan of Corrections + comments
  poc: ["create", "update", "delete", "read"] as const,

  // DOC / compliance dates & status
  compliance: ["create", "update", "delete", "read"] as const,

  // Home screen analytics
  analytics: ["read"] as const,
} as const);

// Keep if you use owner anywhere
export const owner = ac.newRole({});

export const admin = ac.newRole({
  // Admin - Managing and Viewing Users
  // (manage org members/invitations uses defaultStatements actions)
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  user: ["read"],

  // Admin - Managing and Viewing Templates/Facilities/Residents/Surveys/POC/Compliance + Analytics
  template: ["create", "update", "delete", "read"],
  facility: ["create", "update", "delete", "read"],
  resident: ["create", "update", "delete", "read"],
  survey: ["create", "update", "delete", "read"], // includes lock/unlock + generate POC
  poc: ["create", "update", "delete", "read"],
  compliance: ["create", "update", "delete", "read"],
  analytics: ["read"],
});

export const viewer = ac.newRole({
  // Viewer - Viewing Users
  user: ["read"],

  // Viewer - Viewing Templates/Facilities/Residents/Surveys/POC/Compliance + Analytics
  template: ["read"],
  facility: ["read"],
  resident: ["read"],
  survey: ["read"],
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});

export const lead_surveyor = ac.newRole({
  // Lead Surveyor - Viewing Users
  user: ["read"],

  // Lead Surveyor - Viewing Facilities
  facility: ["read"],

  // Lead Surveyor - Managing and Viewing Residents
  resident: ["create", "update", "read"],

  // Lead Surveyor - Managing and Viewing Surveys + Lock/Unlock + Generate POC + Edit Findings
  survey: ["create", "update", "read"],

  // Lead Surveyor - Edit POCs
  poc: ["update", "read"],

  // Lead Surveyor - Home screen analytics
  analytics: ["read"],

  // Not listed explicitly, but safe to allow read since they will see status on UI in many flows
  compliance: ["read"],
});

export const surveyor = ac.newRole({
  // Surveyor - Complete assigned templates + View all surveys
  survey: ["update", "read"],

  // Surveyor - View all POCs + compliance dates + analytics
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});

export const facility_coordinator = ac.newRole({
  // Facility Coordinator - Viewing Templates
  template: ["read"],

  // Facility Coordinator - Viewing his facility survey responses
  survey: ["read"],

  // Facility Coordinator - Viewing his facility POCs + Complete/Edit POCs
  poc: ["update", "read"],

  // Facility Coordinator - Enter Compliance Dates
  compliance: ["create", "update", "read"],

  // Facility Coordinator - analytics
  analytics: ["read"],
});

export const facility_viewer = ac.newRole({
  // Facility Viewer - Viewing Templates
  template: ["read"],

  // Facility Viewer - Viewing his facility survey responses/POCs/compliance + analytics
  survey: ["read"],
  poc: ["read"],
  compliance: ["read"],
  analytics: ["read"],
});


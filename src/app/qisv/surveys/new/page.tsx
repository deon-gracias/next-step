"use client";

import { canUI, type AppRole } from "@/lib/ui-permissions";
import { QISVHeader } from "../../_components/header";
import { NewSurveyForm } from "../_components/new-survey-form";
import { authClient } from "@/components/providers/auth-client";
import { useQuery } from "@tanstack/react-query";

function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    r === "viewer" ||
    r === "lead_surveyor" ||
    r === "surveyor" ||
    r === "facility_coordinator" ||
    r === "facility_viewer" ||
    r === "admin"
  ) {
    return r as AppRole;
  }
  return null;
}

export default function() {
  const activeOrg = authClient.useActiveOrganization();

  const { data: appRole, isLoading: roleLoading } = useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
  });

  const canCreateSurveys =
    canUI(appRole, "surveys.manage") && appRole != "surveyor";

  // ✅ Access denied state
  if (!canCreateSurveys) {
    return (
      <>
        <QISVHeader
          crumbs={[
            { label: "Surveys", href: "/qisv/surveys" },
            { label: "New" },
          ]}
        />
        <main className="px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-destructive text-lg font-semibold">
                Access Denied
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                You don't have permission to create surveys.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }
  return (
    <>
      <QISVHeader
        crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: "New" }]}
      />

      <main className="px-4">
        <NewSurveyForm />
      </main>
    </>
  );
}

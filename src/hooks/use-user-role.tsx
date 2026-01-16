import { authClient } from "@/components/providers/auth-client";
import type { AppRole } from "@/lib/ui-permissions";
import { useQuery } from "@tanstack/react-query";

export function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    [
      "viewer",
      "lead_surveyor",
      "surveyor",
      "facility_coordinator",
      "facility_viewer",
    ].includes(r)
  ) {
    return r as AppRole;
  }
  return null;
}

export function useUserRole() {
  const activeOrg = authClient.useActiveOrganization();

  return useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

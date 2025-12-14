"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/components/providers/auth-client";
import { api } from "@/trpc/react";

export function useRoleAssignment() {
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const updateRole = api.user.updateRoleOnAcceptance.useMutation();
  
  // ✅ Use ref to track if we've already run
  const hasRun = useRef(false);

  useEffect(() => {
    // ✅ Skip if already run this session
    if (hasRun.current) return;
    
    // ✅ Add null checks
    if (!session.data?.user || !activeOrg.data?.id) return;

    const userId = session.data.user.id;
    const orgId = activeOrg.data.id;

    // ✅ Mark as run immediately to prevent loops
    hasRun.current = true;

    updateRole.mutate(
      {
        userId,
        organizationId: orgId,
      },
      {
        onError: (error: any) => {
          // Reset on error so it can retry
          hasRun.current = false;
          console.error("Role assignment failed:", error);
        },
      }
    );
  }, [session.data?.user?.id, activeOrg.data?.id]); // ✅ Only depend on IDs
}

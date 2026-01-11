"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon, MoreVerticalIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

export function PendingInvitationsList() {
  const activeOrganization = authClient.useActiveOrganization();
  const [pendingSearch, setPendingSearch] = useState("");
  const [invitationToCancel, setInvitationToCancel] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const pendingInvitations = api.invitation.list.useQuery(
    { organizationId: activeOrganization.data?.id ?? "", status: "pending" },
    { enabled: !!activeOrganization.data },
  );

  const manageMemberPermission = useQuery({
    queryKey: ["permissions", "update-member-pending"],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          organizationId: activeOrganization.data!.id,
          permissions: { member: ["update"] },
        })
      ).data?.success,
    enabled: !!activeOrganization.data,
  });

  const deleteInvitation = api.invitation.delete.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled");
      pendingInvitations.refetch();
      setInvitationToCancel(null);
    },
    onError: () => toast.error("Failed to cancel invitation"),
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: () => toast.success("Invitation resent successfully"),
    onError: () => toast.error("Failed to resend invitation"),
  });

  const filteredInvitations = pendingInvitations.data?.filter((inv) =>
    inv.email.toLowerCase().includes(pendingSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pending Accounts</h2>
          {!pendingInvitations.data ? (
            <Skeleton className="h-4 w-52" />
          ) : (
            <p className="text-muted-foreground text-sm">
              {pendingInvitations.data.length} Pending User
              {pendingInvitations.data.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search User"
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            className="w-[250px] pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="bg-muted/50 grid grid-cols-[2fr_2fr_1fr_100px] gap-4 border-b p-4 text-sm font-semibold">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Action</div>
        </div>
        <div className="divide-y">
          {!pendingInvitations.data &&
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 p-4"
              >
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}

          {filteredInvitations?.map((inv) => (
            <div
              key={inv.id}
              className="grid grid-cols-[2fr_2fr_1fr_100px] items-center gap-4 p-4"
            >
              <span className="text-sm font-medium">
                {inv.email.split("@")[0]}
              </span>
              <span className="text-muted-foreground text-sm">{inv.email}</span>
              <Badge variant="secondary" className="w-fit">
                {inv.role || "member"}
              </Badge>
              {manageMemberPermission.data && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => resendInvitation.mutate({ id: inv.id })}
                    >
                      Resend Invite
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() =>
                        setInvitationToCancel({ id: inv.id, email: inv.email })
                      }
                    >
                      Cancel Invitation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {filteredInvitations?.length === 0 && (
            <div className="text-muted-foreground p-8 text-center text-sm">
              No pending invitations found
            </div>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={!!invitationToCancel}
        onOpenChange={(open) => !open && setInvitationToCancel(null)}
        title="Cancel Invitation?"
        description={
          <>
            Are you sure you want to cancel the invitation for{" "}
            <strong>{invitationToCancel?.email}</strong>?
          </>
        }
        confirmText="Cancel Invitation"
        variant="destructive"
        onConfirm={() =>
          invitationToCancel &&
          deleteInvitation.mutate({ id: invitationToCancel.id })
        }
      />
    </div>
  );
}

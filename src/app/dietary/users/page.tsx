"use client";

import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { authClient } from "@/components/providers/auth-client";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { roles } from "@/lib/permissions";
import { SearchIcon, MoreVerticalIcon, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";

export default function DietaryUsersPage() {
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();
  
  const [activeSearch, setActiveSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [memberToDelete, setMemberToDelete] = useState<{ email: string; name: string } | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<{ id: string; email: string } | null>(null);
  
  // ✅ Track which dropdown is open
  const [openMemberDropdown, setOpenMemberDropdown] = useState<string | null>(null);
  const [openInvitationDropdown, setOpenInvitationDropdown] = useState<string | null>(null);

  const organizationMembers = useQuery({
    queryKey: ["listMembers", activeOrganization.data?.id],
    queryFn: async () =>
      await authClient.organization.listMembers({
        fetchOptions: {},
        query: {
          organizationId: activeOrganization.data?.id ?? "",
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
        },
      }),
    enabled: !!activeOrganization.data,
  });

  const pendingInvitations = api.invitation.list.useQuery(
    {
      organizationId: activeOrganization.data?.id ?? "",
      status: "pending",
    },
    { enabled: !!activeOrganization.data }
  );

  const deleteInvitation = api.invitation.delete.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled successfully");
      pendingInvitations.refetch();
    },
    onError: () => {
      toast.error("Failed to cancel invitation");
    },
  });

  const resendInvitation = api.invitation.resend.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent successfully");
    },
    onError: () => {
      toast.error("Failed to resend invitation");
    },
  });

  const manageMemberPermission = useQuery({
    queryKey: ["permissions", "update-member", session.data?.user],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          organizationId: activeOrganization.data!.id,
          permissions: { member: ["update"] },
        })
      ).data?.success,
    enabled: !!activeOrganization.data,
  });

  const filteredActiveMembers = organizationMembers.data?.data?.members.filter(
    (member) =>
      member.user.name?.toLowerCase().includes(activeSearch.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(activeSearch.toLowerCase())
  );

  const filteredPendingInvitations = pendingInvitations.data?.filter(
    (inv) => inv.email.toLowerCase().includes(pendingSearch.toLowerCase())
  );

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberToDelete.email,
        organizationId: activeOrganization.data!.id,
      });
      toast.success("Member removed successfully");
      organizationMembers.refetch();
    } catch (error) {
      toast.error("Failed to remove member");
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleCancelInvitation = () => {
    if (!invitationToCancel) return;
    
    deleteInvitation.mutate({ id: invitationToCancel.id });
    setInvitationToCancel(null);
  };

  return (
    <>
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dietary" className="hover:text-foreground">
              Dietary
            </Link>
            <span>/</span>
            <span className="text-foreground">Users</span>
          </div>
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-6 px-6 py-4">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <ChefHat className="h-7 w-7 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dietary Users</h1>
            <p className="text-muted-foreground text-sm">
              Manage user access and permissions for dietary surveys
            </p>
          </div>
        </div>

        {/* Active Users Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Active Users</h2>
              {!organizationMembers.data ? (
                <Skeleton className="h-4 w-52" />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {organizationMembers.data.data?.total ?? 0} Active User
                  {organizationMembers.data.data?.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search User"
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              {activeOrganization.data && manageMemberPermission.data && (
                <InviteMemberDialog organizationId={activeOrganization.data.id} />
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 border-b bg-muted/50 p-4 font-semibold text-sm">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Action</div>
            </div>

            <div className="divide-y">
              {!organizationMembers.data &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}

              {filteredActiveMembers?.map((member) => (
                <div key={member.id} className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 p-4 items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{member.user.name}</span>
                  </div>

                  <span className="text-sm text-muted-foreground">{member.user.email}</span>

                  {manageMemberPermission.data &&
                  session.data &&
                  session.data.user.id !== member.userId ? (
                    <>
                      <Select
                        defaultValue={member.role}
                        onValueChange={async (e) => {
                          try {
                            await authClient.organization.updateMemberRole({
                              role: e as "member" | "admin" | "owner",
                              memberId: member.id,
                            });
                            toast.success("Role updated successfully");
                            organizationMembers.refetch();
                          } catch (error) {
                            toast.error("Failed to update role");
                          }
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                            {member.role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {roles.map((e) => (
                            <SelectItem key={e.label} value={e.label}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu 
                        open={openMemberDropdown === member.id} 
                        onOpenChange={(open) => setOpenMemberDropdown(open ? member.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Account</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={(e) => {
                              e.preventDefault();
                              setMemberToDelete({ 
                                email: member.user.email, 
                                name: member.user.name || member.user.email 
                              });
                              setOpenMemberDropdown(null);
                            }}
                          >
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                      <div />
                    </>
                  )}
                </div>
              ))}

              {filteredActiveMembers?.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No active members found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Accounts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pending Accounts</h2>
              {!pendingInvitations.data ? (
                <Skeleton className="h-4 w-52" />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {pendingInvitations.data.length} User{pendingInvitations.data.length !== 1 ? "s" : ""} Pending
                </p>
              )}
            </div>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search User"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 border-b bg-muted/50 p-4 font-semibold text-sm">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Action</div>
            </div>

            <div className="divide-y">
              {!pendingInvitations.data &&
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 p-4">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}

              {filteredPendingInvitations?.map((invitation) => (
                <div key={invitation.id} className="grid grid-cols-[2fr_2fr_1fr_100px] gap-4 p-4 items-center">
                  <span className="font-medium text-sm">{invitation.email.split("@")[0]}</span>
                  <span className="text-sm text-muted-foreground">{invitation.email}</span>
                  <Badge variant="secondary">{invitation.role || "member"}</Badge>
                  
                  {manageMemberPermission.data && (
                    <DropdownMenu 
                      open={openInvitationDropdown === invitation.id} 
                      onOpenChange={(open) => setOpenInvitationDropdown(open ? invitation.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            resendInvitation.mutate({ id: invitation.id });
                            setOpenInvitationDropdown(null);
                          }}
                          disabled={resendInvitation.isPending}
                        >
                          Resend Invite
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setInvitationToCancel({ 
                              id: invitation.id, 
                              email: invitation.email 
                            });
                            setOpenInvitationDropdown(null);
                          }}
                        >
                          Cancel Invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}

              {filteredPendingInvitations?.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No pending invitations found
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Member Modal */}
      {memberToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setMemberToDelete(null);
            }
          }}
        >
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Delete Member?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to remove <strong>{memberToDelete.name}</strong> from the organization? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMemberToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteMember}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Invitation Modal */}
      {invitationToCancel && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setInvitationToCancel(null);
            }
          }}
        >
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Cancel Invitation?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to cancel the invitation for <strong>{invitationToCancel.email}</strong>? They will no longer be able to accept it.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInvitationToCancel(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleCancelInvitation}>Cancel Invitation</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

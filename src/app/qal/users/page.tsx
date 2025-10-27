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
import { XIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function QALTeamPage() {
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();
  
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

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/qal/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Surveys
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">QAL Team</h1>
          </div>
          {!organizationMembers.data ? (
            <Skeleton className="h-4 w-52" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {organizationMembers.data.data?.total ?? 0} team member
              {organizationMembers.data.data?.total !== 1 ? "s" : ""} in your QAL organization
            </p>
          )}
        </div>

        {activeOrganization.data && manageMemberPermission.data && (
          <InviteMemberDialog organizationId={activeOrganization.data.id} />
        )}
      </div>

      <Separator />

      {/* Members List */}
      <div className="divide-y rounded-lg border bg-card">
        {!organizationMembers.data &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[220px]" />
              </div>
              <Skeleton className="h-9 w-[80px]" />
            </div>
          ))}

        {organizationMembers.data?.data &&
          organizationMembers.data.data.members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Invite team members to collaborate on QAL surveys
              </p>
              {activeOrganization.data && manageMemberPermission.data && (
                <InviteMemberDialog organizationId={activeOrganization.data.id} />
              )}
            </div>
          )}

        {organizationMembers.data?.data &&
          organizationMembers.data.data.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.image || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {member.user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">
                    {member.user.name}
                  </p>
                  {session.data?.user.id === member.userId && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>

              {manageMemberPermission.data &&
              session.data &&
              session.data.user.id !== member.userId ? (
                <div className="flex items-center gap-2">
                  <Select
                    defaultValue={member.role}
                    onValueChange={async (newRole) => {
                      await authClient.organization.updateMemberRole({
                        role: newRole as "member" | "admin" | "owner",
                        memberId: member.id,
                      });
                      organizationMembers.refetch();
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      {member.role}
                    </SelectTrigger>
                    <SelectContent align="end">
                      {roles.map((role) => (
                        <SelectItem key={role.label} value={role.label}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeOrganization.data && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={async () => {
                        if (
                          confirm(
                            `Remove ${member.user.name} from the organization?`
                          )
                        ) {
                          await authClient.organization.removeMember({
                            memberIdOrEmail: member.user.email,
                            organizationId: activeOrganization.data!.id,
                          });
                          organizationMembers.refetch();
                        }
                      }}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <Badge
                  variant={member.role === "admin" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {member.role}
                </Badge>
              )}
            </div>
          ))}
      </div>
    </main>
  );
}

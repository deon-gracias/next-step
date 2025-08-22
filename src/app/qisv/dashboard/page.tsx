"use client";

import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { QISVHeader } from "../_components/header";
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
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function () {
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();
  const organizationMembers = useQuery({
    queryKey: ["listMembers", activeOrganization.data?.id],
    queryFn: async () =>
      await authClient.organization.listMembers({
        fetchOptions: {},
        query: {
          organizationId: activeOrganization.data?.id ?? "",
          limit: 10,
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
    <>
      <QISVHeader crumbs={[{ label: "Dashboard" }]} />

      <main className="flex flex-1 flex-col gap-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Members</h2>
            {!organizationMembers.data ? (
              <Skeleton className="max-w- h-4 w-52" />
            ) : (
              <p className="text-muted-foreground max-w-fit text-sm">
                {organizationMembers.data.data?.total ?? 0} member
                {organizationMembers.data.data?.total !== 1 ? "s" : ""} across
                all organizations
              </p>
            )}
          </div>
          {activeOrganization.data && manageMemberPermission.data && (
            <InviteMemberDialog organizationId={activeOrganization.data.id} />
          )}
        </div>

        <div className="divide-y rounded-2xl border">
          {!organizationMembers.data &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton key={i} className="size-8 rounded-full" />

                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>

                <Skeleton className="h-4 w-[50px]" />
              </div>
            ))}

          {organizationMembers.data?.data &&
            organizationMembers.data.data.members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 p-4">
                <Avatar>
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback>
                    {member.user.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-none font-medium">
                    {member.user.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {member.user.email}
                  </p>
                </div>

                {manageMemberPermission.data &&
                session.data &&
                session.data.user.id !== member.userId ? (
                  <>
                    <Select
                      defaultValue={member.role}
                      onValueChange={async (e) => {
                        await authClient.organization.updateMemberRole({
                          role: e as "member" | "admin" | "owner",
                          memberId: member.id,
                        });
                        organizationMembers.refetch();
                      }}
                    >
                      <SelectTrigger>{member.role}</SelectTrigger>
                      <SelectContent align="end">
                        {roles.map((e) => (
                          <SelectItem key={e.label} value={e.label}>
                            {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {activeOrganization.data && (
                      <Button
                        size="icon"
                        variant={"ghost"}
                        onClick={() => {
                          authClient.organization.removeMember({
                            memberIdOrEmail: member.user.email,
                            organizationId: activeOrganization.data!.id,
                          });
                        }}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                )}
              </div>
            ))}
        </div>
      </main>
    </>
  );
}

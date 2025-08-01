"use client";

import * as React from "react";
import { ChevronsUpDownIcon, CommandIcon, PlusIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "./providers/auth-client";
import { useRouter } from "next/navigation";

export function OrganizationSwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const activeTeam = authClient.useActiveOrganization();
  const organizations = authClient.useListOrganizations();

  if (activeTeam.isPending) {
    return null;
  }

  if (!activeTeam.data) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <CommandIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeTeam.data.name}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.data &&
              organizations.data.map((org, index) => (
                <DropdownMenuItem
                  key={org.name}
                  onClick={() =>
                    authClient.organization.setActive({
                      organizationId: org.id,
                      fetchOptions: {
                        onSuccess: () => {
                          router.replace(`/${org.slug}`);
                        },
                      },
                    })
                  }
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <CommandIcon className="size-3.5 shrink-0" />
                    {/* <org.logo className="size-3.5 shrink-0" /> */}
                  </div>
                  {org.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

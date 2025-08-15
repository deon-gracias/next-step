"use client";

import * as React from "react";
import {
  BuildingIcon,
  FileSearchIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  UsersIcon,
} from "lucide-react";

import { OrganizationSwitcher } from "@/components/org-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import Link from "next/link";

const navItems = [
  {
    name: "Dashboard",
    href: "/qisv/dashboard",
    icon: LayoutDashboardIcon,
    resource: null, // no permission needed
  },
  {
    name: "Residents",
    href: "/qisv/residents",
    icon: UsersIcon,
    resource: "resident",
  },
  {
    name: "Facilities",
    href: "/qisv/facilities",
    icon: BuildingIcon,
    resource: "facility",
  },
  {
    name: "Templates",
    href: "/qisv/templates",
    icon: LayoutListIcon,
    resource: "template",
  },
  {
    name: "Surveys",
    href: "/qisv/surveys",
    icon: FileSearchIcon,
    resource: "survey",
  },
];

export function QISVSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const activeOrg = authClient.useActiveOrganization();

  const { data: allowedResources, isLoading } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const results: Record<string, boolean> = {};
      for (const item of navItems) {
        if (!item.resource) {
          results[item.name] = true;
        } else {
          results[item.name] = !!(
            await authClient.organization.hasPermission({
              // organizationId: activeOrg.data!.id,
              permission: { [item.resource]: ["read"] },
            })
          ).data?.success;
        }
      }
      return results;
    },
    enabled: !!activeOrg.data,
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isLoading &&
                navItems
                  .filter((item) => allowedResources?.[item.name])
                  .map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton tooltip={item.name} asChild>
                        <Link href={item.href}>
                          <item.icon className="!size-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

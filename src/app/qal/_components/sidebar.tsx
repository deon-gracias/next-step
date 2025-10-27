"use client";

import * as React from "react";
import {
  BuildingIcon,
  FileSearchIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  BarChart3Icon,
  PersonStandingIcon,
  User2,
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

// QAL nav items
const navItems = [
  {
    name: "Dashboard",
    href: "/qal/dashboard",
    icon: LayoutDashboardIcon,
    resource: null,
  },
  {
    name: "Surveys",
    href: "/qal/surveys",
    icon: FileSearchIcon,
    resource: null,
    // resource: "qal_survey", // optional permission key
  },
  {
    name: "Template",
    href: "/qal/template",
    icon: LayoutListIcon,
    resource: null,
    // resource: "qal_template",
  },
  {
    name: "Facilities",
    href: "/qal/facilities",
    icon: BuildingIcon,
    resource: null,
    // resource: "facility", // reuse facility permission if you already gate it
  },
  {
    name: "Users",
    href: "/qal/users",
    icon: User2,
    resource: null,
  }
];

export function QALSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const activeOrg = authClient.useActiveOrganization();

  // If you don’t have org-permission checks for QAL yet, you can just allow all.
  const { data: allowedResources, isLoading } = useQuery({
    queryKey: ["qal-user-permissions"],
    queryFn: async () => {
      const results: Record<string, boolean> = {};
      for (const item of navItems) {
        if (!item.resource) {
          results[item.name] = true;
        } else {
          // Mirror your QISV permission style; if you don’t have entries for qal_* yet,
          // either return true here or add permission keys in your auth service.
          results[item.name] =
            (await authClient.organization.hasPermission({
              permission: { [item.resource]: ["read"] },
            })).data?.success ?? true;
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

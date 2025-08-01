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

const navItems = [
  {
    name: "Dashboard",
    href: "/qisv/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    name: "Residents",
    href: "/qisv/residents",
    icon: UsersIcon,
  },
  {
    name: "Facilities",
    href: "/qisv/facilities",
    icon: BuildingIcon,
  },
  {
    name: "Templates",
    href: "/qisv/templates",
    icon: LayoutListIcon,
  },
  {
    name: "Surveys",
    href: "/qisv/surveys",
    icon: FileSearchIcon,
  },
];

export function QISVSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((e) => (
                <SidebarMenuItem key={e.href}>
                  <SidebarMenuButton tooltip={e.name} asChild>
                    <a href={e.href}>
                      <e.icon className="!size-5" />
                      <span>{e.name}</span>
                    </a>
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

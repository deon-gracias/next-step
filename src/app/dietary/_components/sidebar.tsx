"use client";

import * as React from "react";
import {
  ClipboardListIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BuildingIcon,
  UserCircleIcon,
  type LucideIcon,
  FileSearchIcon,
  LayoutListIcon,
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
import { z } from "zod";

const navItemSchema = z.object({
  name: z.string(),
  href: z.string(),
  icon: z.custom<LucideIcon>(),
});
type NavItemType = z.infer<typeof navItemSchema>;

export function DietarySidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const navItems: NavItemType[] = [
    {
      name: "Dashboard",
      href: "/dietary/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      name: "Surveys",
      href: "/dietary/surveys",
      icon: FileSearchIcon,
    },
    {
      name: "Templates",
      href: "/dietary/templates",
      icon: LayoutListIcon,
    },
    {
      name: "Facilities",
      href: "/dietary/facilities",
      icon: BuildingIcon,
    },
    {
      name: "Users",
      href: "/dietary/users",
      icon: User2,
    },
  ];

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

"use client";

import * as React from "react";
import {
  BuildingIcon,
  FileQuestionIcon,
  FileSearchIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  UsersIcon,
  type LucideIcon,
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

export function QISVSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const navItems = [
    {
      name: "Dashboard",
      href: "/dietary/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      name: "Questions",
      href: "/dietary/questions",
      icon: FileQuestionIcon,
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
              <SidebarMenuItem>
                {navItems.map((e) => (
                  <SidebarMenuButton tooltip={e.name} asChild key={e.href}>
                    <a href={e.href}>
                      <e.icon className="!size-5" />
                      <span>{e.name}</span>
                    </a>
                  </SidebarMenuButton>
                ))}
              </SidebarMenuItem>
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

"use client";

import * as React from "react";
import {
  BuildingIcon,
  FileSearchIcon,
  LayoutDashboardIcon,
  LayoutListIcon,
  TagsIcon,
  User,
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

type AppRole =
  | "admin"
  | "viewer"
  | "lead_surveyor"
  | "surveyor"
  | "facility_coordinator"
  | "facility_viewer";

/**
 * Maps whatever Better Auth returns to your app roles.
 * Common Better Auth org roles are: owner | admin | member. [web:314]
 */
function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "").toLowerCase().trim();

  // Better Auth defaults -> your app
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";

  // Your custom roles (if you actually set these on member.role)
  if (
    r === "viewer" ||
    r === "lead_surveyor" ||
    r === "surveyor" ||
    r === "facility_coordinator" ||
    r === "facility_viewer" ||
    r === "admin"
  ) {
    return r;
  }

  return null;
}

const navItems = [
  { name: "Dashboard", href: "/qisv/dashboard", icon: LayoutDashboardIcon },
  { name: "Surveys", href: "/qisv/surveys", icon: FileSearchIcon },
  { name: "Templates", href: "/qisv/templates", icon: LayoutListIcon },
  { name: "Residents", href: "/qisv/residents", icon: UsersIcon },
  { name: "Facilities", href: "/qisv/facilities", icon: BuildingIcon },
  { name: "F-Tags", href: "/qisv/ftags", icon: TagsIcon },
  { name: "Users", href: "/qisv/users", icon: User },
] as const;

type NavItemName = (typeof navItems)[number]["name"];

const NAV_ALLOWED: Record<AppRole, Set<NavItemName>> = {
  admin: new Set([
    "Dashboard",
    "Surveys",
    "Templates",
    "Residents",
    "Facilities",
    "Users",
    "F-Tags",
  ]),
  viewer: new Set([
    "Dashboard",
    "Surveys",
    "Templates",
    "Residents",
    "Facilities",
    "Users",
    "F-Tags",
  ]),
  lead_surveyor: new Set([
    "Dashboard",
    "Surveys",
    "Residents",
    "Facilities",
    "Users",
    "F-Tags",
  ]),
  surveyor: new Set(["Dashboard", "Surveys"]),
  facility_coordinator: new Set(["Dashboard", "Templates", "Surveys"]),
  facility_viewer: new Set(["Dashboard", "Templates", "Surveys"]),
};

export function QISVSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const activeOrg = authClient.useActiveOrganization();

  const { data: appRole, isLoading } = useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      // Use getActiveMemberRole (simpler + intended for this) [web:314]
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
  });

  const allowed = React.useMemo(() => {
    if (!appRole) return new Set<NavItemName>(["Dashboard"]);
    return NAV_ALLOWED[appRole] ?? new Set<NavItemName>(["Dashboard"]);
  }, [appRole]);

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
                  .filter((item) => allowed.has(item.name))
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

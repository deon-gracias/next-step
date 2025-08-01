"use client";

import { authClient } from "@/components/providers/auth-client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { QISVSidebar } from "./_components/sidebar";

export default function ({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  if (session.isPending) {
    return null;
  }

  if (!session.data) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <QISVSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

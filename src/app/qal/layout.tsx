"use client";

import { authClient } from "@/components/providers/auth-client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { QALSidebar } from "./_components/sidebar";

export default function QALLayout({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  if (session.isPending) {
    return null;
  }

  if (!session.data) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <QALSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

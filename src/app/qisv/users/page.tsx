"use client";

import { QISVHeader } from "../_components/header";
import { ActiveMembersList } from "./_components/active-members";
import { PendingInvitationsList } from "./_components/pending-invitations";

export default function MembersPage() {
  return (
    <>
      <QISVHeader crumbs={[{ label: "Dashboard" }]} />
      <main className="flex flex-1 flex-col gap-6 px-6 py-4">
        <ActiveMembersList />
        <PendingInvitationsList />
      </main>
    </>
  );
}

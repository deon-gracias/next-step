import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "./ui/button";
import { CheckIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function ViewInvitations() {
  const invitations = await auth.api.listUserInvitations({
    headers: await headers(),
  });

  return (
    <div>
      {invitations.map(
        (i) =>
          i.status === "pending" && (
            <div key={i.id} className="flex justify-between">
              <div>{i.organizationId}</div>
              <Button
                size="icon"
                onClick={async () => {
                  "use server";
                  await auth.api.acceptInvitation({
                    headers: await headers(),
                    body: {
                      invitationId: i.id,
                    },
                  });
                  revalidatePath("/");
                }}
              >
                <CheckIcon />
              </Button>
            </div>
          ),
      )}
    </div>
  );
}

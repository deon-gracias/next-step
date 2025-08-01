import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  Building2Icon,
  BuildingIcon,
  ChevronRightIcon,
  LogOutIcon,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ViewInvitations } from "@/components/view-invitations";
import { toast } from "sonner";

export default async function () {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const organizationData = await auth.api.listOrganizations({
    headers: await headers(),
  });

  if (organizationData.length < 1 || !organizationData[0]) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-600">
              Access Required
            </CardTitle>
            <CardDescription>
              You don't belong to any organization. Please contact your
              organization admin for access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ViewInvitations />
            <Button
              onClick={async () => {
                "use server";
                auth.api.signOut({
                  headers: await headers(),
                });
                redirect("/sign-in");
              }}
              className="w-full"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-6">
      <h1 className="text-foreground/70 text-center text-4xl font-extralight tracking-tighter">
        Welcome {session.user.name}
      </h1>

      <div className="bg-background mt-12 w-full rounded-2xl border">
        {organizationData.map((e) => (
          <div
            key={e.id}
            className="group hover:bg-accent/70 flex items-center gap-4 border-b p-4 transition-colors last:border-b-0"
            onClick={async () => {
              "use server";
              const data = await auth.api.setActiveOrganization({
                headers: await headers(),
                body: {
                  organizationId: e.id,
                },
              });

              if (!data) {
                toast("Failed to set active organizations");
                return;
              }

              redirect(`/${data.slug}`);
            }}
          >
            <div className="bg-secondary group-hover:bg-primary/20 flex size-8 items-center justify-center rounded-lg transition-colors">
              <Building2Icon className="text-primary size-4" />
            </div>

            <h2>{e.name}</h2>

            <ChevronRightIcon className="ml-auto size-4" />
          </div>
        ))}
      </div>

      <ViewInvitations />
    </div>
  );
}

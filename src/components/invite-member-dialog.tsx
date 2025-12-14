"use client";

import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { authClient } from "./providers/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { roles } from "@/lib/permissions";
import { FacilityComboBox } from "@/app/qisv/_components/facility-dropdown";
import { api as apiClient } from "@/trpc/react";
import { useState } from "react";

const sendInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(roles.map((e) => e.label) as [string, ...string[]]),
  facilityId: z.number(),
});

type SendInviteType = z.infer<typeof sendInviteSchema>;

export function InviteMemberDialog({
  organizationId,
  children,
}: {
  organizationId: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const updateInvitationRole = apiClient.user.updateRole.useMutation(); // ✅ New mutation
  const addMemberToFacility = apiClient.user.assignToFacility.useMutation();

  const form = useForm<SendInviteType>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      email: "",
      role: roles[0]!.label,
      facilityId: -1,
    },
  });

  async function onSubmit(values: SendInviteType) {
    try {
      // ✅ Step 1: Send Better Auth invitation (always as "member" base role)
      const betterAuthRole = values.role === "admin" ? "admin" : "member";
      const member = await authClient.organization.inviteMember({
        email: values.email,
        role: betterAuthRole,
        organizationId,
      });

      if (member.error) {
        throw new Error(member.error.message);
      }

      // ✅ Step 2: Update the invitation with custom role (for ALL roles)
      await updateInvitationRole.mutateAsync({
        email: values.email,
        organizationId: organizationId,
        role: values.role,
      });

      // ✅ Step 3: If facility_coordinator, assign to facility
      if (values.role === "facility_coordinator" && values.facilityId > -1) {
        await addMemberToFacility.mutateAsync({
          facilityId: values.facilityId,
          email: values.email,
          organizationId,
          role: values.role,
        });
      }

      toast.success(`Invited ${values.email} as ${values.role}`);
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant={"secondary"}>
            <PlusIcon />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Invite Member</DialogTitle>

        <Form {...form}>
          <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <FormField
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(e) => field.onChange(e)}
                      >
                        <SelectTrigger className="capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((e) => (
                            <SelectItem
                              value={e.label}
                              key={e.label}
                              className="capitalize"
                            >
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("role") === "facility_coordinator" && (
              <FormField
                name="facilityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility</FormLabel>
                    <FacilityComboBox
                      selectedItem={field.value}
                      onSelect={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button 
              className="col-span-full" 
              type="submit"
              disabled={updateInvitationRole.isPending || addMemberToFacility.isPending}
            >
              {updateInvitationRole.isPending || addMemberToFacility.isPending 
                ? "Sending..." 
                : "Send Invitation"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

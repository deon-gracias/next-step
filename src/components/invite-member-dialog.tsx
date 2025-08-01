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
import { defaultRoles } from "better-auth/plugins";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { roles } from "@/lib/permissions";

const sendInviteSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]),
});

type SendInviteType = z.infer<typeof sendInviteSchema>;

export function InviteMemberDialog({
  organizationId,
  children,
}: {
  organizationId: string;
  children?: React.ReactNode;
}) {
  const form = useForm({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      email: "",
      role: roles[0].label,
    },
  });

  function onSubmit(values: SendInviteType) {
    toast.promise(
      authClient.organization.inviteMember({
        email: values.email,
        role: values.role,
        organizationId,
      }),
      {
        success: (res) => {
          if (res.error) {
            throw res.error;
          }
          return `Invited ${res.data?.email}`;
        },
        error: (err) => {
          return err.message;
        },
      },
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant={"secondary"}>
            <PlusIcon />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Invite</DialogTitle>

        <Form {...form}>
          <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
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

            <Button className="col-span-full">Send</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

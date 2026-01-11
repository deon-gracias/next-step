"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/components/providers/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PlusIcon, Loader2, Trash2Icon } from "lucide-react";
import { roles } from "@/lib/permissions";
import { FacilityComboBox } from "@/app/qisv/_components/facility-dropdown";
import { api as apiClient } from "@/trpc/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

// ✅ Schema now supports multiple facilities
const sendInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(roles.map((e) => e.label) as [string, ...string[]]),
  facilityIds: z.array(z.number()), // Changed from single number to array
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
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(
    null,
  );

  // We keep a local map of ID -> Name for the UI list since the form only stores IDs
  const [facilityNames, setFacilityNames] = useState<Record<number, string>>(
    {},
  );

  const updateInvitationRole = apiClient.user.updateRole.useMutation();
  const addMemberToFacility = apiClient.user.assignToFacility.useMutation();

  const form = useForm<SendInviteType>({
    resolver: zodResolver(sendInviteSchema),
    defaultValues: {
      email: "",
      role: roles[0]!.label,
      facilityIds: [],
    },
  });

  // --- Handlers ---

  const handleAddFacility = () => {
    if (selectedFacilityId && selectedFacilityId > -1) {
      const currentIds = form.getValues("facilityIds");

      if (!currentIds.includes(selectedFacilityId)) {
        // Update Form Data
        form.setValue("facilityIds", [...currentIds, selectedFacilityId]);

        // Update UI Names (Placeholder name since ComboBox only gives ID)
        // Ideally, your ComboBox should return the full object, but this works for now.
        setFacilityNames((prev) => ({
          ...prev,
          [selectedFacilityId]: `Facility #${selectedFacilityId}`,
        }));

        setSelectedFacilityId(null);
      }
    }
  };

  const handleRemoveFacility = (idToRemove: number) => {
    const currentIds = form.getValues("facilityIds");
    form.setValue(
      "facilityIds",
      currentIds.filter((id) => id !== idToRemove),
    );
  };

  async function onSubmit(values: SendInviteType) {
    try {
      // 1. Send Base Invitation
      const betterAuthRole = values.role === "admin" ? "admin" : "member";
      const member = await authClient.organization.inviteMember({
        email: values.email,
        role: betterAuthRole,
        organizationId,
      });

      if (member.error) throw new Error(member.error.message);

      // 2. Update Role (Custom RBAC)
      await updateInvitationRole.mutateAsync({
        email: values.email,
        organizationId: organizationId,
        role: values.role,
      });

      // 3. Batch Assign Facilities
      // Only runs if role allows it and facilities were selected
      if (
        ["facility_coordinator", "facility_viewer"].includes(values.role) &&
        values.facilityIds.length > 0
      ) {
        // Run all assignments in parallel
        await Promise.all(
          values.facilityIds.map((fid) =>
            addMemberToFacility.mutateAsync({
              facilityId: fid,
              email: values.email, // Using email because User ID might not exist yet
              organizationId,
              role: values.role,
            }),
          ),
        );
      }

      toast.success(`Invited ${values.email}`);
      form.reset();
      setFacilityNames({});
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    }
  }

  const isSubmitting =
    form.formState.isSubmitting ||
    updateInvitationRole.isPending ||
    addMemberToFacility.isPending;
  const currentRole = form.watch("role");
  const selectedFacilities = form.watch("facilityIds");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant={"secondary"}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>Invite Member</DialogTitle>
          <DialogHeader>Send an invitation to a new user.</DialogHeader>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 py-4">
          <Form {...form}>
            <form
              id="invite-form"
              className="space-y-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Email & Role Row */}
              <div className="grid grid-cols-[1fr_200px] gap-4">
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="colleague@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="role"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="capitalize">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((e) => (
                            <SelectItem
                              key={e.label}
                              value={e.label}
                              className="capitalize"
                            >
                              {e.label.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional Facility Assignment */}
              {["facility_coordinator", "facility_viewer"].includes(
                currentRole,
              ) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Assign Facilities</Label>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <FacilityComboBox
                            selectedItem={selectedFacilityId ?? -1}
                            onSelect={setSelectedFacilityId}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddFacility}
                          disabled={
                            !selectedFacilityId || selectedFacilityId === -1
                          }
                        >
                          <PlusIcon className="mr-2 h-4 w-4" /> Add
                        </Button>
                      </div>

                      {/* Selected List */}
                      <div className="max-h-[150px] divide-y overflow-y-auto rounded-md border">
                        {selectedFacilities.length === 0 ? (
                          <div className="bg-muted/20 text-muted-foreground p-3 text-center text-sm">
                            No facilities selected
                          </div>
                        ) : (
                          selectedFacilities.map((id) => (
                            <div
                              key={id}
                              className="flex items-center justify-between p-2 px-3 text-sm"
                            >
                              <span>
                                {facilityNames[id] || `Facility #${id}`}
                              </span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 h-6 w-6"
                                onClick={() => handleRemoveFacility(id)}
                              >
                                <Trash2Icon className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
            </form>
          </Form>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t p-6 pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="invite-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

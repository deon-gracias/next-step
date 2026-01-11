"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { authClient } from "@/components/providers/auth-client";
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react";
import { roles } from "@/lib/permissions";
import { FacilityComboBox } from "@/app/qisv/_components/facility-dropdown";
import { api } from "@/trpc/react";
import type { User } from "better-auth";
import type { Member } from "better-auth/plugins";

interface EditMemberDialogProps {
  member: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
    } | null;
  };
  isOpen?: boolean;
  organizationId: string;
  onClose?: () => void;
  onUpdate?: () => void;
  children?: React.ReactNode;
}

export function EditMemberDialog({
  member,
  isOpen,
  onClose,
  organizationId,
  onUpdate,
  children,
}: EditMemberDialogProps) {
  const [role, setRole] = useState("member");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(
    null,
  );

  const utils = api.useUtils();

  const assignedFacilities = api.user.getAssignedFacilities.useQuery(
    { userId: member.userId ?? "", organizationId },
    { enabled: !!member.userId },
  );

  const addMemberToFacility = api.user.assignToFacility.useMutation({
    onSuccess: () => {
      assignedFacilities.refetch();
      setSelectedFacilityId(-1);
      toast.success("Facility assigned");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberFromFacility = api.user.removeFromFacility.useMutation({
    onSuccess: () => {
      assignedFacilities.refetch();
      toast.success("Facility removed");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (member) {
      setRole(member.role);
    }
  }, [member]);

  const handleAddFacility = () => {
    if (selectedFacilityId && selectedFacilityId > -1 && member.userId) {
      addMemberToFacility.mutate({
        facilityId: selectedFacilityId,
        userId: member.userId,
        organizationId,
      });
    }
  };

  const handleRemoveFacility = (facilityId: number) => {
    if (member.userId) {
      removeMemberFromFacility.mutate({
        facilityId,
        userId: member.userId,
        organizationId,
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authClient.organization.updateMemberRole({
        role: role as "member" | "admin" | "owner",
        memberId: member.id,
      });

      onUpdate && onUpdate();
      onClose && onClose();

      toast.success("Permissions updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open}>
      {" "}
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}{" "}
      <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 p-0">
        {" "}
        <DialogHeader className="border-b p-6 pb-4">
          {" "}
          <DialogTitle>Edit Access: {member.user?.name}</DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Manage role and granular access for {member.user?.email}{" "}
          </DialogDescription>{" "}
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>System Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem
                      key={r.label}
                      value={r.label}
                      className="capitalize"
                    >
                      {r.label.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {["facility_coordinator", "facility_viewer"].includes(role) && (
              <>
                <Separator />

                <div className="space-y-3">
                  <Label>
                    Assigned Facilities ({assignedFacilities.data?.length ?? 0})
                  </Label>

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
                        !selectedFacilityId ||
                        selectedFacilityId === -1 ||
                        addMemberToFacility.isPending
                      }
                    >
                      {addMemberToFacility.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusIcon className="mr-2 h-4 w-4" />
                      )}
                      Add
                    </Button>
                  </div>

                  <div className="max-h-[150px] divide-y overflow-y-auto rounded-md border">
                    {!assignedFacilities.data ||
                      assignedFacilities.data.length === 0 ? (
                      <div className="bg-muted/20 text-muted-foreground p-3 text-center text-sm">
                        No facilities assigned
                      </div>
                    ) : (
                      assignedFacilities.data.map((fac) => (
                        <div
                          key={fac.facility.id}
                          className="flex items-center justify-between p-2 px-3 text-sm"
                        >
                          <span>{fac.facility.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 h-6 w-6"
                            onClick={() =>
                              handleRemoveFacility(fac.facility.id)
                            }
                            disabled={removeMemberFromFacility.isPending}
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
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 border-t p-6 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

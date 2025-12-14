"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChefHat,
  ArrowLeft,
  PlusIcon,
  ExternalLinkIcon,
  Pencil,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

// Edit Section Dialog Component
function EditSectionDialog({
  section,
  open,
  onOpenChange,
  templateId,
}: {
  section: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number;
}) {
  const utils = api.useUtils();
  const updateSection = api.dietary.updateSection.useMutation({
    onSuccess: () => {
      toast.success("Section updated successfully");
      utils.dietary.getTemplate.invalidate({ id: templateId });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update section: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    sectionNumber: section.sectionNumber,
    title: section.title,
    maxPoints: section.maxPoints,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSection.mutate({
      id: section.id,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Section Number</Label>
            <Input
              type="number"
              value={formData.sectionNumber}
              onChange={(e) =>
                setFormData({ ...formData, sectionNumber: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label>Max Points</Label>
            <Input
              type="number"
              value={formData.maxPoints}
              onChange={(e) =>
                setFormData({ ...formData, maxPoints: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSection.isPending}>
              {updateSection.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DietaryTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = Number(params.templateId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);

  // Fetch template with sections
  const template = api.dietary.getTemplate.useQuery({ id: templateId });

  const utils = api.useUtils();

  const deleteSection = api.dietary.deleteSection.useMutation({
    onSuccess: () => {
      toast.success("Section deleted successfully");
      utils.dietary.getTemplate.invalidate({ id: templateId });
    },
    onError: (error) => {
      toast.error(`Failed to delete section: ${error.message}`);
    },
  });

  if (template.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!template.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  const sections = template.data.sections ?? [];
  const totalPoints = sections.reduce(
    (acc, section) => acc + section.maxPoints,
    0
  );

  return (
    <>
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dietary/templates" className="hover:text-foreground">
              Templates
            </Link>
            <span>/</span>
            <span className="text-foreground">{template.data.name}</span>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 space-y-6">
        {/* Template Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <ChefHat className="h-8 w-8 text-orange-600" />
                <div>
                  <CardTitle className="text-2xl">{template.data.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Machine Type:{" "}
                    <Badge variant="secondary">
                      {template.data.machineType === "high_temp"
                        ? "High Temp"
                        : "Low Temp"}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-3xl font-bold text-orange-600">
                  {totalPoints} pts
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Sections */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Sections ({sections.length})
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Section</DialogTitle>
              </DialogHeader>
              <div className="text-muted-foreground">Form coming next...</div>
            </DialogContent>
          </Dialog>
        </div>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No sections yet. Add your first section to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id}>
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {section.sectionNumber}
                        </Badge>
                        <div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {section.questions?.length ?? 0} questions •{" "}
                            {section.maxPoints} points
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingSectionId(section.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Section?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{section.title}" and
                                all its questions. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteSection.mutate({ id: section.id })
                                }
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Link
                          href={`/dietary/templates/${templateId}/sections/${section.id}`}
                          className={cn(
                            buttonVariants({ size: "sm", variant: "outline" })
                          )}
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          View Questions
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
                <EditSectionDialog
                  section={section}
                  open={editingSectionId === section.id}
                  onOpenChange={(open) => !open && setEditingSectionId(null)}
                  templateId={templateId}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

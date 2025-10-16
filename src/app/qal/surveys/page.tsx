"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/components/providers/auth-client";
// ✅ ADD THIS: Import your auth hook

export default function QALSurveysIndex() {
  const utils = api.useUtils();
  
  // ✅ GET CURRENT USER
  const session = authClient.useSession();

  // Facilities from the shared facility table
  const facilities = api.facility.list.useQuery({ page: 1, pageSize: 100 });

  // Templates for dropdown
  const templates = api.qal.listTemplates.useQuery();

  // Page filter (optional)
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined);

  // Surveys listing
  const surveys = api.qal.listSurveys.useQuery({ facilityId });

  // Create survey
  const create = api.qal.createSurvey.useMutation();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>(undefined);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);
  const [surveyDate, setSurveyDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  const handleOpenCreate = () => {
    const firstFacility = facilities.data?.data?.[0]?.id;
    const firstTemplate = templates.data?.[0]?.id;
    setSelectedFacilityId(firstFacility);
    setSelectedTemplateId(firstTemplate);
    setSurveyDate(format(new Date(), "yyyy-MM-dd"));
    setOpen(true);
  };

  const handleConfirmCreate = async () => {
    // ✅ CHECK FOR LOGGED IN USER
    if (!session?.data?.user?.id) {
      toast.error("You must be logged in to create a survey");
      return;
    }

    if (!selectedFacilityId) {
      toast.error("Select a facility");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Select a template");
      return;
    }
    if (!surveyDate) {
      toast.error("Select a survey date");
      return;
    }

    try {
      // ✅ USE REAL USER ID FROM SESSION
      const sv = await create.mutateAsync({
        facilityId: selectedFacilityId,
        templateId: selectedTemplateId,
        surveyDate: new Date(surveyDate),
        auditorUserId: session.data.user.id, // ← Real user ID
      });

      await utils.qal.listSurveys.invalidate();
      toast.success("Survey created");
      setOpen(false);

      // Navigate to survey detail
      window.location.href = `/qal/surveys/${sv.id}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create survey");
    }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QAL Surveys</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage facility-level QAL audit surveys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={facilityId?.toString() ?? "all"}
            onValueChange={(val) => setFacilityId(val === "all" ? undefined : Number(val))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All facilities</SelectItem>
              {facilities.data?.data?.map((f) => (
                <SelectItem key={f.id} value={f.id.toString()}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleOpenCreate} 
            disabled={templates.isLoading || !session?.data?.user?.id} // ✅ Disable if not logged in
          >
            New Survey
          </Button>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Surveys</CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(surveys.data ?? []).map((s) => {
                  const fac = facilities.data?.data?.find((f) => f.id === s.facilityId);
                  const tpl = templates.data?.find((t) => t.id === s.templateId);

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                      <TableCell>{fac?.name ?? `ID ${s.facilityId}`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tpl?.name ?? `Template ${s.templateId}`}
                      </TableCell>
                      <TableCell>
                        {s.surveyDate ? format(new Date(s.surveyDate), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={Number(s.overallPercent) >= 90 ? "default" : "secondary"}
                        >
                          {Number(s.overallPercent).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.isLocked ? "secondary" : "outline"}>
                          {s.isLocked ? "Locked" : "In Progress"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/qal/surveys/${s.id}/facility/${s.facilityId}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!surveys.data || surveys.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No surveys yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Survey Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New QAL Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplateId?.toString() ?? "none"}
                onValueChange={(val) =>
                  setSelectedTemplateId(val === "none" ? undefined : Number(val))
                }
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select template
                  </SelectItem>
                  {templates.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Facility Selection */}
            <div className="space-y-2">
              <Label htmlFor="facility">Facility</Label>
              <Select
                value={selectedFacilityId?.toString() ?? "none"}
                onValueChange={(val) =>
                  setSelectedFacilityId(val === "none" ? undefined : Number(val))
                }
              >
                <SelectTrigger id="facility">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    Select facility
                  </SelectItem>
                  {facilities.data?.data?.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Survey Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Survey Date</Label>
              <Input
                id="date"
                type="date"
                value={surveyDate}
                onChange={(e) => setSurveyDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create Survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

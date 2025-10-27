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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function QALSurveysIndex() {
  const utils = api.useUtils();
  const session = authClient.useSession();

  const facilities = api.facility.list.useQuery({ page: 1, pageSize: 100 });
  const templates = api.qal.listTemplates.useQuery();

  const [facilityId, setFacilityId] = useState<number | undefined>(undefined);
  const surveys = api.qal.listSurveys.useQuery({ facilityId });
  const create = api.qal.createSurvey.useMutation();

  const [open, setOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>(undefined);
  const [surveyDate, setSurveyDate] = useState<Date | undefined>(new Date());
  const [surveyType, setSurveyType] = useState<"onsite" | "offsite">("onsite");
  const [administrator, setAdministrator] = useState("");
  const [businessOfficeManager, setBusinessOfficeManager] = useState("");
  const [assistantBusinessOfficeManager, setAssistantBusinessOfficeManager] = useState("");

  const handleOpenCreate = () => {
    const firstFacility = facilities.data?.data?.[0]?.id;
    setSelectedFacilityId(firstFacility);
    setSurveyDate(new Date());
    setSurveyType("onsite");
    setAdministrator("");
    setBusinessOfficeManager("");
    setAssistantBusinessOfficeManager("");
    setOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!session?.data?.user?.id) {
      toast.error("You must be logged in to create a survey");
      return;
    }

    if (!selectedFacilityId) {
      toast.error("Please select a facility");
      return;
    }

    if (!surveyDate) {
      toast.error("Please select a survey date");
      return;
    }

    if (!administrator.trim()) {
      toast.error("Administrator name is required");
      return;
    }

    if (!businessOfficeManager.trim()) {
      toast.error("Business Office Manager name is required");
      return;
    }

    const firstActiveTemplate = templates.data?.find(t => t.isActive)?.id;
    if (!firstActiveTemplate) {
      toast.error("No active template found");
      return;
    }

    try {
      const sv = await create.mutateAsync({
        facilityId: selectedFacilityId,
        templateId: firstActiveTemplate,
        surveyDate: surveyDate,
        auditorUserId: session.data.user.id,
        surveyType: surveyType,
        administrator: administrator.trim(),
        businessOfficeManager: businessOfficeManager.trim(),
        assistantBusinessOfficeManager: assistantBusinessOfficeManager.trim() || undefined,
      });

      await utils.qal.listSurveys.invalidate();
      toast.success("Survey created successfully");
      setOpen(false);

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
            disabled={templates.isLoading || !session?.data?.user?.id}
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
                          href={`/qal/surveys/${s.id}`}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New QAL Survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Facility Selection */}
            <div className="space-y-2">
              <Label htmlFor="facility">
                Facility <span className="text-red-500">*</span>
              </Label>
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
              <Label>
                Survey Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !surveyDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {surveyDate ? format(surveyDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={surveyDate}
                    onSelect={setSurveyDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Survey Type - On-Site/Off-Site */}
            <div className="space-y-2">
              <Label>
                Survey Type <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={surveyType === "onsite" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSurveyType("onsite")}
                >
                  On-Site
                </Button>
                <Button
                  type="button"
                  variant={surveyType === "offsite" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSurveyType("offsite")}
                >
                  Off-Site
                </Button>
              </div>
            </div>

            {/* Administrator */}
            <div className="space-y-2">
              <Label htmlFor="administrator">
                Administrator <span className="text-red-500">*</span>
              </Label>
              <Input
                id="administrator"
                placeholder="Enter administrator name"
                value={administrator}
                onChange={(e) => setAdministrator(e.target.value)}
              />
            </div>

            {/* Business Office Manager */}
            <div className="space-y-2">
              <Label htmlFor="bom">
                Business Office Manager <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bom"
                placeholder="Enter business office manager name"
                value={businessOfficeManager}
                onChange={(e) => setBusinessOfficeManager(e.target.value)}
              />
            </div>

            {/* Assistant Business Office Manager */}
            <div className="space-y-2">
              <Label htmlFor="abom">
                Assistant Business Office Manager <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="abom"
                placeholder="Enter assistant BOM name (optional)"
                value={assistantBusinessOfficeManager}
                onChange={(e) => setAssistantBusinessOfficeManager(e.target.value)}
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

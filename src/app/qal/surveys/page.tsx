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

// Simple dialog components; replace with your own if you already have a Dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function QALSurveysIndex() {
  // Facilities from the shared facility table
  const facilities = api.qal.listFacilities.useQuery();

  // Page filter (optional)
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined);

  // Surveys listing
  const surveys = api.qal.listSurveys.useQuery({ page: 1, pageSize: 50, facilityId });

  // Create survey
  const create = api.qal.createSurvey.useMutation();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | "">("");

  const handleOpenCreate = () => {
    const first = facilities.data?.[0]?.id ?? "";
    setSelectedFacilityId(first as number | "");
    setOpen(true);
  };

  const handleConfirmCreate = async () => {
    const fid = typeof selectedFacilityId === "number" ? selectedFacilityId : undefined;
    if (!fid) {
      toast.error("Select a facility");
      return;
    }
    try {
      const sv = await create.mutateAsync({ facilityId: fid });
      toast.success("Survey created");
      setOpen(false);
      window.location.href = `/qal/surveys/${sv.id}/facility/${fid}`;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create survey");
    }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QAL Surveys</h1>
          <p className="text-sm text-muted-foreground">Create and manage facility-level QAL surveys</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={facilityId ?? ""}
            onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All facilities</option>
            {facilities.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button onClick={handleOpenCreate}>New Survey</Button>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Surveys</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(surveys.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.facilityId}</TableCell>
                  <TableCell>{s.surveyDate ? format(new Date(s.surveyDate), "yyyy-MM-dd") : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={Number(s.overallPercent) >= 90 ? "default" : "secondary"}>
                      {Number(s.overallPercent).toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isLocked ? "secondary" : "outline"}>{s.isLocked ? "Locked" : "In Progress"}</Badge>
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
              ))}
              {(!surveys.data || surveys.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No surveys yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Survey Dialog (uses facility table) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new QAL survey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm">Facility</label>
            <select
              className="border rounded px-2 py-1 text-sm w-full"
              value={selectedFacilityId}
              onChange={(e) =>
                setSelectedFacilityId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Select facility</option>
              {facilities.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate} disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

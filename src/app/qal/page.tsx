"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayoutListIcon, FileSearchIcon, BuildingIcon, BarChart3Icon } from "lucide-react";

export default function QALDashboardPage() {
  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QAL Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Quality Assurance Liaison — facility-level audits and reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/qal/surveys" className={buttonVariants()}>
            Open Surveys
          </Link>
          <Link href="/qal/surveys" className={buttonVariants({ variant: "outline" })}>
            New Survey
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearchIcon className="h-4 w-4" />
              Surveys
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create and manage QAL surveys for each facility.
            <div className="mt-3">
              <Link href="/qal/surveys" className={buttonVariants({ size: "sm" })}>
                Go to Surveys
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutListIcon className="h-4 w-4" />
              Template
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            View the active QAL template with sections and questions.
            <div className="mt-3">
              <Link href="/qal/template" className={buttonVariants({ size: "sm" })}>
                View Template
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BuildingIcon className="h-4 w-4" />
              Facilities
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Browse facilities to start or review audits.
            <div className="mt-3">
              <Link href="/qal/facilities" className={buttonVariants({ size: "sm" })}>
                View Facilities
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3Icon className="h-4 w-4" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Review completed survey reports and overall scores.
            <div className="mt-3">
              <Link href="/qal/reports" className={buttonVariants({ size: "sm" })}>
                View Reports
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Status Summary (dummy placeholders you can wire later) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">In-Progress Surveys</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-semibold">—</div>
              <div className="text-xs text-muted-foreground">Active survey sessions</div>
            </div>
            <Badge variant="secondary">Live</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Completed (Locked)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-semibold">—</div>
              <div className="text-xs text-muted-foreground">Ready for reporting</div>
            </div>
            <Badge>Ready</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">POC Required</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-semibold">—</div>
              <div className="text-xs text-muted-foreground">Sections under 90%</div>
            </div>
            <Badge variant="destructive">Action</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Surveys</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No data yet. Create a survey to get started.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Template Highlights</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The active template includes 10 sections (Admissions, Census, AR categories, MISC, Cash Handling, AP Ancillaries, RTF). You can edit content via seeds or admin tools.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

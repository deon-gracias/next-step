"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default function QALTemplatePage() {
  const tpl = api.qal.getActiveTemplate.useQuery();

  if (!tpl.data) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No active QAL template</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Seed the QAL template using your qal_seed.ts, then refresh this page.
          </CardContent>
        </Card>
      </main>
    );
  }

  const totalPossible = (tpl.data.sections ?? []).reduce((s, r) => s + Number(r.possiblePoints ?? 0), 0);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tpl.data.name}</h1>
          <p className="text-sm text-muted-foreground">
            Active facility-level audit template with sections and checklist questions
          </p>
        </div>
        <Badge variant="secondary">Sections: {tpl.data.sections?.length ?? 0}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Possible Points</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tpl.data.sections.map((s, idx) => (
                <TableRow key={s.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="text-right">{Number(s.possiblePoints)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/qal/template/${tpl.data!!.id}?sectionId=${s.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View Items
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell />
                <TableCell className="font-semibold">Total Possible</TableCell>
                <TableCell className="text-right font-semibold">{totalPossible}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

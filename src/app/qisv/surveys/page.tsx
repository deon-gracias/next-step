"use client";

import { api } from "@/trpc/react";
import { QISVHeader } from "../_components/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { authClient } from "@/components/providers/auth-client";

export default function () {
  const session = authClient.useSession();

  const surveys = api.survey.list.useQuery({});
  const surveysPending = api.survey.pendingSurveys.useQuery(
    {
      surveyorId: session.data?.user.id,
    },
    { enabled: !!(session.data && session.data.user.id) },
  );

  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />

      <main className="prose px-4">
        <Link href={`/qisv/surveys/new`} className={cn(buttonVariants())}>
          Create Survey
        </Link>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Surveyor</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Template</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.data &&
              surveys.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.surveyorId}</TableCell>
                  <TableCell>{e.facilityId}</TableCell>
                  <TableCell>{e.templateId}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        <h3>Surveys Pending</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Surveyor</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Template</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveysPending.data &&
              surveysPending.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>{e.surveyorId}</TableCell>
                  <TableCell>{e.facilityId}</TableCell>
                  <TableCell>{e.templateId}</TableCell>
                  <TableCell>
                    <Link href={`/qisv/surveys/${e.id}/`}>
                      <ExternalLinkIcon />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </main>
    </>
  );
}

"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../_components/header";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import GeneralQuestions from "../_components/general-questions";

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = Number(params.surveyId);

  const survey = api.survey.byId.useQuery({ id: surveyId });
  const residents = api.survey.listResidents.useQuery({ surveyId });
  const cases = api.survey.listCases.useQuery({ surveyId });

  if (!survey.data || !residents.data || !cases.data) {
    return (
      <>
        <QISVHeader
          crumbs={[
            { label: "Surveys", href: "/qisv/surveys" },
            { label: `Survey #${surveyId}` },
          ]}
        />
        <main className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}` },
        ]}
      />

      <main className="p-4">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          Survey #{surveyId} – {survey.data.templateId}{" "}
          {survey.data.template && <Badge>{survey.data.template.type}</Badge>}
        </h1>
        <p className="mb-4">
          Facility&nbsp;{survey.data.facilityId} ・ Surveyor&nbsp;
          {survey.data.surveyorId}
        </p>

        {survey.data.template?.type === "general" && (
          <>
            <GeneralQuestions surveyId={surveyId} />
          </>
        )}

        {survey.data.template?.type === "case" && (
          <>
            <h2 className="mb-3 text-xl font-semibold">Cases</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.caseCode}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/qisv/surveys/${surveyId}/case/${r.id}`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {survey.data.template?.type === "resident" && (
          <>
            <h2 className="mb-3 text-xl font-semibold">Residents</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.residentId}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/qisv/surveys/${surveyId}/resident/${r.residentId}`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </main>
    </>
  );
}

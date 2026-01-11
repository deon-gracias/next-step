"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, type RouterOutputs } from "@/trpc/react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  MapPin,
  Building2,
  FileText,
  Hash,
  Mail,
  CheckCircle2,
  LoaderIcon,
  CheckCircle2Icon,
  LockIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  Trash2Icon,
} from "lucide-react";
import { cn, getInitialsFromUsername } from "@/lib/utils";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";

type Survey = RouterOutputs["survey"]["list"]["data"][number];

export function SurveyScore({ id }: { id: number }) {
  const { data, isLoading } = api.survey.scoreById.useQuery(
    { id },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return <Skeleton className="h-6 w-16 rounded-md" />;
  }

  if (!data) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  // >= 85% : Green
  // 50-84% : Yellow/Orange
  // < 50%  : Red
  let colorClass = "bg-destructive text-destructive-foreground";

  if (data.percentage >= 85) {
    colorClass = "bg-green-500 text-white";
  } else if (data.percentage >= 50) {
    colorClass = "bg-amber-100 text-amber-700";
  }

  return (
    <div className="flex items-center gap-2">
      {/* Percentage Badge */}
      <Badge
        variant="outline"
        className={cn("px-2 py-0.5 whitespace-nowrap", colorClass)}
      >
        {data.percentage}%
      </Badge>

      {/* Raw Score Detail (Small and subtle) */}
      <span className="text-muted-foreground text-xs tabular-nums">
        ({data.score}/{data.totalPossible})
      </span>
    </div>
  );
}

export const surveyColumns: ColumnDef<Survey>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Hash className="text-muted-foreground h-3 w-3" />
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "surveyDate",
    header: "Date",
    cell: ({ row }) => {
      return (
        <div className="flex w-fit items-center gap-2">
          <CalendarDays className="text-muted-foreground size-3" />
          <span className="text-sm font-medium tabular-nums">
            {format(row.original.surveyDate, "PPP")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "template",
    header: "Template",
    cell: ({ row }) => {
      const template = row.original.template;

      if (!template)
        return <span className="text-muted-foreground">Unkown Template</span>;

      return (
        <HoverCard>
          <HoverCardTrigger className="flex cursor-pointer items-center gap-2">
            <FileText
              className={cn(
                "text-muted-foreground size-3",
                template.type === "case" && "text-chart-1",
                template.type === "general" && "text-chart-2",
                template.type === "resident" && "text-chart-3",
              )}
            />

            <span>{template.name}</span>
          </HoverCardTrigger>
          <HoverCardContent className="p-4" align={"start"}>
            <div className="flex justify-between space-x-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{template.name}</h4>
                <div className="flex items-center pt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      template.type === "case" && "text-chart-1 border-chart-1",
                      template.type === "general" &&
                      "text-chart-2 border-chart-2",
                      template.type === "resident" &&
                      "text-chart-3 border-chart-3",
                    )}
                  >
                    {template.type}
                  </Badge>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    },
  },
  {
    accessorKey: "facility",
    header: "Facility",
    cell: ({ row }) => {
      const facility = row.original.facility;
      if (!facility)
        return (
          <span className="text-muted-foreground text-xs">
            Unknown Facility
          </span>
        );

      return (
        <HoverCard>
          <HoverCardTrigger className="flex cursor-pointer items-center gap-2">
            <Building2 className="text-muted-foreground size-3" />
            <span className="text-sm font-medium">{facility.name}</span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <div className="space-y-1">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  {facility.name}
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {facility.facilityCode}
                  </Badge>
                </h4>
                <div className="text-muted-foreground flex items-start gap-1 pt-1 text-xs">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{facility.address}</span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    },
  },

  {
    accessorKey: "surveyor",
    header: "Surveyor",
    cell: ({ row }) => {
      const surveyor = row.original.surveyor;
      if (!surveyor) return <span className="text-muted-foreground">-</span>;

      return (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="hover:bg-muted/50 flex w-fit cursor-pointer items-center gap-2 rounded-md p-1 transition-colors">
              <Avatar className="size-6">
                <AvatarImage src={surveyor.image ?? ""} />
                <AvatarFallback>
                  {getInitialsFromUsername(surveyor.name, 1)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate text-sm">
                {surveyor.name}
              </span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-start space-x-4">
              <Avatar>
                <AvatarImage src={surveyor.image ?? ""} />
                <AvatarFallback>
                  {getInitialsFromUsername(surveyor.name, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{surveyor.name}</h4>
                <div className="text-muted-foreground flex items-center text-xs">
                  <Mail className="mr-1 h-3 w-3" />
                  {surveyor.email}
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    },
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      if (row.original.pocGenerated)
        return (
          <Badge variant="outline">
            <CheckCircleIcon className="text-green-700" />
            Completed
          </Badge>
        );

      if (row.original.isLocked)
        return (
          <Badge variant="outline">
            <LockIcon className="text-yellow-700" />
            Locked
          </Badge>
        );

      return (
        <Badge variant="outline">
          <LoaderIcon /> In Progress
        </Badge>
      );
    },
  },

  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => {
      return <SurveyScore id={row.original.id} />;
    },
  },

  {
    accessorKey: "action",
    header: "Actions",
    cell: ({ row }) => {
      return (
        <ButtonGroup>
          <a
            href={`/qisv/surveys/${row.original.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "size-8",
            )}
          >
            <ExternalLinkIcon />
          </a>
          <Button variant={"destructive"} size="icon" className="size-8">
            <Trash2Icon />
          </Button>
        </ButtonGroup>
      );
    },
  },
];

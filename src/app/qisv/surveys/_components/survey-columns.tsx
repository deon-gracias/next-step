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
  LoaderIcon,
  LockIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  Trash2Icon,
  ArrowUpDown,
} from "lucide-react";
import { cn, getInitialsFromUsername } from "@/lib/utils";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

type Survey = RouterOutputs["survey"]["list"]["data"][number];

// Extracted Score Component with better loading state
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

  // Score color logic
  const getScoreColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-500 text-white";
    if (percentage >= 50) return "bg-amber-100 text-amber-700";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          "px-2 py-0.5 whitespace-nowrap",
          getScoreColor(data.percentage),
        )}
      >
        {data.percentage}%
      </Badge>
      <span className="text-muted-foreground text-xs tabular-nums">
        ({data.score}/{data.totalPossible})
      </span>
    </div>
  );
}

// Template Cell Component
function TemplateCell({ template }: { template: Survey["template"] }) {
  if (!template) {
    return <span className="text-muted-foreground">Unknown Template</span>;
  }

  const typeColors = {
    case: "text-chart-1 border-chart-1",
    general: "text-chart-2 border-chart-2",
    resident: "text-chart-3 border-chart-3",
  };

  return (
    <HoverCard>
      <HoverCardTrigger className="flex cursor-pointer items-center gap-2">
        <FileText
          className={cn("size-3", {
            "text-chart-1": template.type === "case",
            "text-chart-2": template.type === "general",
            "text-chart-3": template.type === "resident",
          })}
        />
        <span>{template.name}</span>
      </HoverCardTrigger>
      <HoverCardContent className="p-4" align="start">
        <div className="flex justify-between space-x-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{template.name}</h4>
            <div className="flex items-center pt-2">
              <Badge
                variant="outline"
                className={cn("text-xs", typeColors[template.type])}
              >
                {template.type}
              </Badge>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Facility Cell Component
function FacilityCell({ facility }: { facility: Survey["facility"] }) {
  if (!facility) {
    return (
      <span className="text-muted-foreground text-xs">Unknown Facility</span>
    );
  }

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
}

// Surveyor Cell Component
function SurveyorCell({ surveyor }: { surveyor: Survey["surveyor"] }) {
  if (!surveyor) {
    return <span className="text-muted-foreground">-</span>;
  }

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
}

// Status Cell Component
function StatusCell({ survey }: { survey: Survey }) {
  if (survey.pocGenerated) {
    return (
      <Badge variant="outline">
        <CheckCircleIcon className="text-green-700" />
        POC Generated
      </Badge>
    );
  }

  if (survey.isLocked) {
    return (
      <Badge variant="outline">
        <LockIcon className="text-yellow-700" />
        Locked
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <LoaderIcon />
      In Progress
    </Badge>
  );
}

// Column Definitions
export const surveyColumns: ColumnDef<Survey>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 h-8"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex w-fit items-center gap-2">
        <CalendarDays className="text-muted-foreground size-3" />
        <span className="text-sm font-medium tabular-nums">
          {format(row.original.surveyDate, "PPP")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "template",
    header: "Template",
    cell: ({ row }) => <TemplateCell template={row.original.template} />,
  },
  {
    accessorKey: "facility",
    header: "Facility",
    cell: ({ row }) => <FacilityCell facility={row.original.facility} />,
  },
  {
    accessorKey: "surveyor",
    header: "Surveyor",
    cell: ({ row }) => <SurveyorCell surveyor={row.original.surveyor} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell survey={row.original} />,
  },
  {
    accessorKey: "score",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 h-8"
      >
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <SurveyScore id={row.original.id} />,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
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
        <Button variant="destructive" size="icon" className="size-8">
          <Trash2Icon />
        </Button>
      </ButtonGroup>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

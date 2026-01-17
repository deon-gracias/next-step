"use client";

import { api } from "@/trpc/react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Suspense } from "react"; // Required for useSearchParams hooks
import { Skeleton } from "@/components/ui/skeleton";
import { QISVHeader } from "../_components/header";
import { useDebounce } from "@uidotdev/usehooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/components/providers/auth-client";
import { useUserRole } from "@/hooks/use-user-role";
import Link from "next/link";
import { canUI } from "@/lib/ui-permissions";
import { cn } from "@/lib/utils";

// URL State Parsers
const searchParsers = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  q: parseAsString.withDefault(""),
};

// --- Dedicated Skeleton Component for cleaner main code ---
function FacilityTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell>
            {/* Matches Badge shape */}
            <Skeleton className="h-5 w-16 rounded-md" />
          </TableCell>
          <TableCell className="w-full">
            {/* Matches Name text */}
            <Skeleton className="h-5 w-48 max-w-[80%]" />
          </TableCell>
          <TableCell>
            {/* Matches Address text */}
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="text-right">
            {/* Matches Icon Button */}
            <Skeleton className="ml-auto h-9 w-9 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FacilitySelectionContent() {
  const router = useRouter();

  const currentUser = authClient.useSession();
  const { data: memberRole } = useUserRole();
  const canManageSurveys =
    canUI(memberRole, "surveys.manage") && memberRole !== "surveyor";

  // 1. URL State Management
  const [params, setParams] = useQueryStates(searchParsers, {
    history: "replace",
    shallow: false,
  });

  // Debounce search
  const debouncedSearch = useDebounce(params.q, 500);

  // 2. Fetch Facilities
  const facilityQuery = api.facility.list.useQuery(
    {
      page: params.page,
      pageSize: params.pageSize,
      name: debouncedSearch || undefined,
      showAll: false,
    },
    {
      // UX Improvement: Keep previous data visible while fetching new page/search
      // This prevents the "flash of skeleton" on every keystroke/page change
      placeholderData: (previousData) => previousData,
    },
  );

  // 3. Handlers
  const handleSearch = (value: string) => {
    setParams({ q: value, page: 1 });
  };

  const handleRowClick = (facilityId: number) => {
    router.push(`/qisv/surveys/facility/${facilityId}`);
  };

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Facility Surveys</h1>
        <p className="text-muted-foreground">
          Select a facility to view its specific survey calendar and history.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search facilities..."
            className="pl-9"
            value={params.q}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {canManageSurveys && (
          <Link href="/qisv/surveys/new" className={buttonVariants()}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Survey
          </Link>
        )}
      </div>

      {/* Data Card */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableBody
            // Optional: visual indicator if refetching in background while showing old data
            className={cn(
              facilityQuery.isFetching &&
              !facilityQuery.isLoading &&
              "opacity-50 transition-opacity",
            )}
          >
            {facilityQuery.isLoading ? (
              <FacilityTableSkeleton />
            ) : facilityQuery.data?.data.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No facilities found matching "{params.q}"
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              facilityQuery.data?.data.map((facility) => (
                <TableRow
                  key={facility.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(facility.id)}
                >
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {facility.facilityCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-full font-medium">
                    {facility.name}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-muted-foreground max-w-[150px] cursor-help truncate text-sm">
                          {facility.address || (
                            <span className="italic opacity-50">
                              No address
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      {facility.address && (
                        <TooltipContent>{facility.address}</TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 px-2">
        <div className="text-muted-foreground flex-1 text-sm">
          Page {params.page} of {facilityQuery.data?.totalPages ?? 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParams({ page: Math.max(1, params.page - 1) })}
          disabled={params.page <= 1 || facilityQuery.isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParams({ page: params.page + 1 })}
          disabled={
            params.page >= (facilityQuery.data?.totalPages ?? 1) ||
            facilityQuery.isLoading
          }
        >
          Next
        </Button>
      </div>
    </main>
  );
}

// Export wrapped in Suspense for nuqs
export default function FacilitySelectionPage() {
  return (
    <>
      <QISVHeader
        crumbs={[{ label: "Surveys" }, { label: "Select Facility" }]}
      />
      <Suspense
        fallback={
          <div className="container mx-auto space-y-6 p-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        }
      >
        <FacilitySelectionContent />
      </Suspense>
    </>
  );
}

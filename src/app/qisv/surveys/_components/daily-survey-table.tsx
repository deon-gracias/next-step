import { api } from "@/trpc/react";
import { SurveyDataTable } from "./survey-data-table";
import { surveyColumns } from "./survey-columns";
import { format } from "date-fns";
import { useState } from "react";
import { type OnChangeFn, type RowSelectionState } from "@tanstack/react-table";

interface DailySurveyTableProps {
  date: string;
  filters: any;
  rowSelection?: RowSelectionState;
  onRowSelection?: OnChangeFn<RowSelectionState> | undefined;
}

export function DailySurveyTable({
  date,
  filters,
  rowSelection,
  onRowSelection,
}: DailySurveyTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const surveysQuery = api.survey.list.useQuery({
    ...filters,
    surveyDate: date,
    page,
    pageSize,
  });

  return (
    <SurveyDataTable
      rowSelection={rowSelection}
      onRowSelection={onRowSelection}
      columnVisibility={{ facility: false, id: false }}
      columns={surveyColumns}
      isLoading={surveysQuery.isLoading}
      data={surveysQuery.data?.data ?? []}
      pageSize={pageSize}
      pageCount={surveysQuery.data?.meta.pageCount ?? 0}
    />
  );
}

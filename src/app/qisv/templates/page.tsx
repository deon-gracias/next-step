"use client";

import { QISVHeader } from "../_components/header";
import { api } from "@/trpc/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTemplateForm } from "./_components/new-template-form";
import { NewFtagForm } from "../_components/new-ftag-form";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/components/providers/auth-client";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZES = [10, 50, 100];

export default function TemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? PAGE_SIZES[0]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const templates = api.template.list.useQuery({
    page,
    pageSize,
  });

  const hasNewTemplatePermission = useQuery({
    queryKey: [],
    queryFn: async () =>
      (
        await authClient.organization.hasPermission({
          permissions: { organization: ["update"] },
        })
      ).data?.success ?? false,
  });

  function handlePage(newPage: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(newPage));
    router.replace(`?${newSearchParams.toString()}`);
  }

  function handlePageSize(newSize: number) {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("pageSize", String(newSize));
    newSearchParams.set("page", "1"); // reset to page 1
    router.replace(`?${newSearchParams.toString()}`);
  }

  return (
    <>
      <QISVHeader crumbs={[{ label: "Templates" }]} />
      <main className="px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>

          {hasNewTemplatePermission.data && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="size-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[400px] sm:w-[540px]">
                <DialogHeader>
                  <DialogTitle>New Template</DialogTitle>
                </DialogHeader>
                <NewTemplateForm />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                <TableHead className="w-[80px] text-right">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Question Count</TableHead>
                <TableHead className="max-w-fit"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.isPending &&
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="flex justify-end">
                      <Skeleton className="ml-auto h-6 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell className="flex justify-end">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                    <TableCell className="max-w-fit">
                      <Skeleton className="ml-auto size-6" />
                    </TableCell>
                  </TableRow>
                ))}

              {!templates.isPending && templates.data?.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No templates found. Add your first template to get started.
                  </TableCell>
                </TableRow>
              )}

              {!templates.isPending &&
                templates.data &&
                templates.data.data.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="text-right font-mono tabular-nums">
                      {template.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge variant={"secondary"}>{template.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {template.questionCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/qisv/templates/${template.id}`}
                        className={cn(
                          buttonVariants({ size: "icon", variant: "outline" }),
                        )}
                      >
                        <ExternalLinkIcon className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="mt-4 flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex" />

          <div className="flex w-full items-center gap-8 lg:w-fit">
            {/* Page Size Selector */}
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => handlePageSize(Number(v))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Info */}
            {templates.data ? (
              <div className="text-sm font-medium">
                Page {page} of {templates.data.totalPages}
              </div>
            ) : (
              <Skeleton className="h-4 w-[50px]" />
            )}

            {/* Navigation */}
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => handlePage(1)}
                disabled={page === 1}
              >
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                onClick={() => handlePage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                onClick={() => handlePage(page + 1)}
                disabled={
                  templates.data ? page === templates.data.totalPages : true
                }
              >
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                onClick={() =>
                  templates.data && handlePage(templates.data.totalPages)
                }
                disabled={
                  templates.data ? page === templates.data.totalPages : true
                }
              >
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

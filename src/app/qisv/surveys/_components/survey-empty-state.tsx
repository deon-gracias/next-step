"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { FileTextIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

export function SurveyEmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
          <FileTextIcon className="text-muted-foreground h-10 w-10" />
        </div>

        <h3 className="mt-4 text-lg font-semibold">No surveys yet</h3>
        <p className="text-muted-foreground mt-2 mb-4 text-sm">
          You haven't created any surveys yet. Get started by creating your
          first survey.
        </p>

        <Link href="/qisv/surveys/new" className={buttonVariants()}>
          <PlusIcon />
          Create your first survey
        </Link>
      </div>
    </div>
  );
}

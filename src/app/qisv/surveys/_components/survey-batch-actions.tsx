"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileIcon, XIcon, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SurveyBatchActionsProps {
  selectedIds: number[];
  onSuccess?: () => void;
  onClearSelection: () => void;
  canGeneratePoc: boolean;
}

export function SurveyBatchActions({
  selectedIds,
  onSuccess,
  onClearSelection,
  canGeneratePoc,
}: SurveyBatchActionsProps) {
  const [error, setError] = useState<{
    title: string;
    description: string;
    ids?: number[];
  } | null>(null);

  const markPocGenerated = api.survey.markPocsGenerated.useMutation({
    onSuccess: async () => {
      toast.success("POC generation enabled successfully");
      if (onSuccess) onSuccess();
      onClearSelection();
    },
    onError: (e) => {
      let title = "Failed to enable POC generation";
      let description = e.message;
      let ids: number[] = [];

      try {
        if (e.message.startsWith("{")) {
          const errorData = JSON.parse(e.message);

          if (errorData.unlockedIds?.length > 0) {
            title = "Cannot Proceed: Surveys Unlocked";
            description = "The following surveys must be locked first:";
            ids = errorData.unlockedIds;
          } else if (errorData.missingIds?.length > 0) {
            title = "Surveys Not Found";
            description = "IDs not found:";
            ids = errorData.missingIds;
          }
        }
      } catch (parseError) {
        // Fallback to raw message
      }

      setError({ title, description, ids });
    },
  });

  const handleGeneratePoc = () => {
    markPocGenerated.mutate({ surveyIds: selectedIds });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in zoom-in-95 duration-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="mb-1 font-semibold">{error.title}</AlertTitle>
          <AlertDescription>
            <p>{error.description}</p>
            {/* Render the list of bad IDs if available */}
            {error.ids && error.ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {error.ids.map((id) => (
                  <Badge
                    key={id}
                    variant="outline"
                    className="border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    ID: {id}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{selectedIds.length} selected</Badge>

        <div className="flex gap-2">
          {canGeneratePoc && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePoc}
              disabled={markPocGenerated.isPending} // 3. Disable while loading
            >
              {markPocGenerated.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileIcon className="mr-2 h-4 w-4" />
              )}
              Generate POC
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={markPocGenerated.isPending}
          >
            <XIcon className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { surveyInsertSchema, type SurveyInsertType } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FacilityComboBox } from "../../_components/facility-dropdown";
import { TemplateComboBox } from "../../_components/template-dropdown";
import { UserComboBox } from "../../_components/user-dropdown";
import {
  surveyCreateInputSchema,
  type SurveyCreateInputType,
} from "@/server/utils/schema";
import { ResidentMultiSelectComboBox } from "../../_components/resident-dropdown";

export function NewSurveyForm({ ...props }: React.ComponentProps<"form">) {
  const createSurvey = api.survey.create.useMutation();

  const form = useForm<SurveyCreateInputType>({
    resolver: zodResolver(surveyCreateInputSchema),
    defaultValues: {
      surveyorId: "",
      facilityId: -1,
      templateId: -1,
      residentIds: [],
    },
  });

  function onSubmit(values: SurveyCreateInputType) {
    toast.promise(createSurvey.mutateAsync(values), {
      loading: "Creating survey...",
      success: () => {
        form.reset();
        return `Successfully created survey`;
      },
      error: "Failed to create survey.",
    });
  }

  return (
    <Form {...form}>
      <form
        className={cn("grid gap-2", props.className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          name="surveyorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User</FormLabel>
              <FormControl>
                <UserComboBox
                  selectedItem={field.value}
                  onSelect={(item) => field.onChange(item)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="facilityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility</FormLabel>
              <FormControl />
              <FacilityComboBox
                selectedItem={field.value}
                onSelect={(item) => field.onChange(item)}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <FormControl />
              <TemplateComboBox
                selectedItem={field.value}
                onSelect={(item) => field.onChange(item)}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("facilityId") > -1 && (
          <FormField
            name="residentIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Residents</FormLabel>
                <FormControl />
                <ResidentMultiSelectComboBox
                  filterParams={{ facilityId: form.watch("facilityId") }}
                  selectedItems={field.value}
                  onChange={(items) => field.onChange(items)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

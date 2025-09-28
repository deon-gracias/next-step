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
import { ftagInsertSchema, type FTagInsertType } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function NewFtagForm({ ...props }: React.ComponentProps<"form">) {
  const ftagMutation = api.ftag.create.useMutation();

  const form = useForm({
    resolver: zodResolver(ftagInsertSchema),
    defaultValues: { code: "", description: "" },
  });

  function onSubmit(values: FTagInsertType) {
    // Ensure description is a string (handle null/undefined cases)
    const sanitizedValues = {
      code: values.code,
      description: values.description || "", // Convert null/undefined to empty string
    };

    toast.promise(ftagMutation.mutateAsync(sanitizedValues), {
      loading: <>Creating F-Tag...</>,
      success: () => {
        form.reset();
        return `Successfully created F-Tag ${values.code}`;
      },
      error: (err) => {
        return `Failed to create F-Tag: ${err?.message || "Unknown error"}`;
      },
    });
  }

  return (
    <Form {...form}>
      <form
        className={cn("grid gap-2", props.className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          name={"code"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>F-Tag Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., F684" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={"description"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Short summary of the regulation"
                  value={field.value || ""} // Ensure value is never null/undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={ftagMutation.isPending}>
          {ftagMutation.isPending ? "Creating..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import {
  templateInsertSchema,
  type TemplateInsertType,
} from "@/server/db/schema";

export function NewTemplateForm({ ...props }: React.ComponentProps<"form">) {
  const utils = api.useUtils();

  const mutation = api.template.create.useMutation();

  const form = useForm<TemplateInsertType>({
    resolver: zodResolver(templateInsertSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: TemplateInsertType) => {
    toast.promise(mutation.mutateAsync(data), {
      loading: "Creating template...",
      success: (res) => {
        const createdTemplate = res[0];
        if (!createdTemplate) {
          return "Created template but no template id";
        }

        utils.template.invalidate();
        return "Created template";
      },
      error: "Failed to create template",
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-4", props.className)}
      >
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Safety Audit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Template</Button>
      </form>
    </Form>
  );
}

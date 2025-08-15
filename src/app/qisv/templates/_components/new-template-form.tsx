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
  templateTypeEnum,
  type TemplateInsertType,
} from "@/server/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewTemplateForm({ ...props }: React.ComponentProps<"form">) {
  const utils = api.useUtils();

  const mutation = api.template.create.useMutation();

  const form = useForm<TemplateInsertType>({
    resolver: zodResolver(templateInsertSchema),
    defaultValues: { name: "", type: "resident" },
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

        <FormField
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templateTypeEnum.enumValues.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Template</Button>
      </form>
    </Form>
  );
}

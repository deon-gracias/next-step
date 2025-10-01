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

// Enhanced schema with custom validation messages
const formSchema = templateInsertSchema.extend({
  name: z
    .string()
    .min(1, "Template name is required")
    .min(3, "Template name must be at least 3 characters")
    .max(100, "Template name must be less than 100 characters")
    .trim(),
});

type FormData = z.infer<typeof formSchema>;

interface NewTemplateFormProps extends React.ComponentProps<"form"> {
  onSuccess?: () => void;
}

export function NewTemplateForm({ onSuccess, ...props }: NewTemplateFormProps) {
  const utils = api.useUtils();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      name: "", 
      type: "resident" 
    },
    mode: "onChange", // Validate on change for immediate feedback
  });

  const mutation = api.template.create.useMutation({
    onSuccess: (res) => {
      const createdTemplate = res[0];
      if (!createdTemplate) {
        toast.error("Created template but no template id");
        return;
      }
      
      // Invalidate queries
      void utils.template.invalidate();
      
      // Reset the form
      form.reset();
      
      // Close the dialog
      onSuccess?.();
      
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled in mutation.onError
      console.error("Template creation failed:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-4", props.className)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Template Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="e.g., Safety Audit"
                  className={cn(
                    form.formState.errors.name && "border-destructive"
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Template Type <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templateTypeEnum.enumValues.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          disabled={mutation.isPending || !form.formState.isValid}
          className="mt-2"
        >
          {mutation.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating...
            </>
          ) : (
            "Create Template"
          )}
        </Button>
      </form>
    </Form>
  );
}

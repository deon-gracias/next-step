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
import {
  facilityInsertSchema,
  type FacilityInsertType,
} from "@/server/db/schema";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function NewFacilityForm({ ...props }: React.ComponentProps<"form">) {
  const utils = api.useUtils();

  const facilityMutation = api.facility.create.useMutation();

  const form = useForm({
    resolver: zodResolver(facilityInsertSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  async function onSubmit(values: FacilityInsertType) {
    toast.promise(facilityMutation.mutateAsync(values), {
      loading: <>Creating facility...</>,
      success: async () => {
        form.reset({});
        utils.facility.invalidate();
        return `Successfully created facility ${values.name}`;
      },
      error: () => {
        return `Failed to create facility ${values.name}`;
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
          name={"name"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={"address"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

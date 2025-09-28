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
  residentInsertSchema,
  type ResidentInsertType,
} from "@/server/db/schema";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FacilityComboBox } from "../../_components/facility-dropdown";
import { Loader2Icon } from "lucide-react";

export function NewResidentForm({ ...props }: React.ComponentProps<"form">) {
  const utils = api.useUtils();

  const residentMutation = api.resident.create.useMutation();

  const form = useForm({
    resolver: zodResolver(residentInsertSchema),
    defaultValues: { name: "", pcciId: "", roomId: "", facilityId: -1 },
  });

  function onSubmit(values: ResidentInsertType) {
    toast.promise(residentMutation.mutateAsync(values), {
      loading: <>Creating resident...</>,
      success: async () => {
        form.reset({});
        utils.resident.invalidate();

        return `Successfully created resident ${values.name}`;
      },
      error: () => {
        return `Failed to create resident ${values.name}`;
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
          name={"roomId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room No</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={"pcciId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>PCC ID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name={"facilityId"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility</FormLabel>
              <FormControl>{/* <Input {...field} /> */}</FormControl>
              <FacilityComboBox
                selectedItem={field.value}
                onSelect={function(item): void {
                  field.onChange(item);
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

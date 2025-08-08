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
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import { FacilityComboBox } from "../../_components/facility-dropdown";
import { TemplateComboBox } from "../../_components/template-dropdown";
import { UserComboBox } from "../../_components/user-dropdown";
import {
  surveyCreateInputSchema,
  type SurveyCreateInputType,
} from "@/server/utils/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  residentInsertSchema,
  surveyResponseInsertSchema,
  type ResidentInsertType,
  type SurveyResponseInsertType,
  type SurveySelectType,
} from "@/server/db/schema";
import { CalendarIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { FacilityHoverCard } from "../../_components/facility-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export const newMultiSurveyCreateInputSchema = z.object({
  surveyDate: z.date(),
  facilityId: z.number().min(0, "Facility ID must be 0 or greater"),
  surveyors: z
    .array(
      z.object({
        surveyorId: z.string().min(1, "Enter a valid surveyor ID"),
        templates: z
          .array(
            z.object({
              templateId: z.number().min(0, "Template ID must be 0 or greater"),
              residentIds: z
                .array(z.number().min(1, "Resident ID must be at least 1"))
                .min(1, "At least one resident is required"),
            }),
          )
          .min(1, "At least one template is required"),
      }),
    )
    .min(1, "At least one surveyor is required"),
});

export type NewMultiSurveyCreateInputType = z.infer<
  typeof newMultiSurveyCreateInputSchema
>;

export function NewSurveyForm({ ...props }: React.ComponentProps<"form">) {
  const createSurvey = api.survey.create.useMutation();

  const form = useForm<NewMultiSurveyCreateInputType>({
    resolver: zodResolver(newMultiSurveyCreateInputSchema),
    defaultValues: {
      surveyDate: new Date(),
      facilityId: -1,
      surveyors: [],
    },
  });

  const surveyorsField = useFieldArray({
    control: form.control,
    name: "surveyors",
  });

  const onSubmit = (values: NewMultiSurveyCreateInputType) => {
    const createSurveyRequest: SurveyCreateInputType[] = [];

    for (const surveyor of values.surveyors) {
      for (const template of surveyor.templates) {
        createSurveyRequest.push({
          surveyDate: values.surveyDate.toUTCString(),
          surveyorId: surveyor.surveyorId,
          facilityId: values.facilityId,
          templateId: template.templateId,
          residentIds: template.residentIds,
        } as SurveyCreateInputType);
      }
    }

    console.log(createSurveyRequest);

    async function createSurveys(survey: SurveyCreateInputType) {
      return await createSurvey.mutateAsync(survey);
    }

    toast.promise(
      Promise.all(createSurveyRequest.map((e) => createSurveys(e))),
      {
        loading: "Creating surveys",
        success: () => {
          form.reset({ facilityId: values.facilityId, surveyors: [] });
          return "Survey created successfully!";
        },
        error: () => "Failed to create survey.",
      },
    );
  };

  return (
    <div className={cn("grid gap-4")}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="surveyDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Survey Date</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Facility */}
          <FormField
            control={form.control}
            name="facilityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facility</FormLabel>
                <FormControl>
                  <FacilityComboBox
                    selectedItem={field.value}
                    onSelect={(item) => field.onChange(item)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* Surveyors */}
      {surveyorsField.fields.map((surveyor, sIndex) => {
        return (
          <SurveyorField
            key={sIndex}
            form={form}
            sIndex={sIndex}
            surveyor={surveyor}
            surveyorsField={surveyorsField}
          />
        );
      })}

      {form.watch("facilityId") > -1 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            toast.success("Created surveyor button");
            surveyorsField.append({ surveyorId: "", templates: [] });
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" /> Add Surveyor
        </Button>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <Button
            type="submit"
            className="mt-4"
            disabled={form.watch("facilityId") < 0}
          >
            Create Survey
          </Button>
        </form>
      </Form>
    </div>
  );
}

function SurveyorField({
  form,
  sIndex,
  surveyor,
  surveyorsField,
}: {
  form: UseFormReturn<NewMultiSurveyCreateInputType>;
  sIndex: number;
  surveyor: any;
  surveyorsField: UseFieldArrayReturn<NewMultiSurveyCreateInputType>;
}) {
  const templatesField = useFieldArray({
    control: form.control,
    name: `surveyors.${sIndex}.templates`,
  });

  return (
    <Card key={surveyor.id}>
      <CardHeader className="flex items-center justify-between">
        <h2 className="font-semibold">Surveyor {sIndex + 1}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => surveyorsField.remove(sIndex)}
        >
          <XIcon />
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Surveyor select */}
        <Form {...form}>
          <FormField
            control={form.control}
            name={`surveyors.${sIndex}.surveyorId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <FormControl>
                  <UserComboBox
                    selectedItem={String(field.value)}
                    onSelect={(item) => field.onChange(item)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>

        {/* Templates */}
        {templatesField.fields.map((template, tIndex) => (
          <Card key={template.id}>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-medium">Template {tIndex + 1}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => templatesField.remove(tIndex)}
              >
                <XIcon />
              </Button>
            </CardHeader>

            <CardContent className="grid gap-4">
              {/* Template select */}
              <Form {...form}>
                <FormField
                  control={form.control}
                  name={`surveyors.${sIndex}.templates.${tIndex}.templateId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template</FormLabel>
                      <FormControl>
                        <TemplateComboBox
                          selectedItem={field.value}
                          onSelect={(item) => field.onChange(item)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>

              {/* Add residents for this template */}
              {form.watch("facilityId") > -1 && (
                <AddResidentInput
                  facilityId={form.getValues("facilityId")}
                  value={form.getValues(
                    `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                  )}
                  onChange={(value) =>
                    form.setValue(
                      `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                      Array.from(new Set(value)),
                    )
                  }
                />
              )}

              {/* Residents table */}
              {form.watch("facilityId") > -1 && (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary text-secondary-foreground">
                        <TableHead className="w-[80px] text-right">
                          ID
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Facility</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>PCCI ID</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.watch(
                        `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                      ).length < 1 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-muted-foreground py-8 text-center"
                          >
                            No residents selected. Add your first resident to
                            get started.
                          </TableCell>
                        </TableRow>
                      )}

                      {form
                        .watch(
                          `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                        )
                        .sort((curr, next) => (curr > next ? 1 : 0))
                        .map((id) => (
                          <ResidentRowById
                            key={id}
                            id={id}
                            handleRemove={() => {
                              form.setValue(
                                `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                                form
                                  .getValues(
                                    `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                                  )
                                  .filter((i) => i !== id),
                              );
                            }}
                          />
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Add template button */}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            templatesField.append({ templateId: -1, residentIds: [] })
          }
        >
          <PlusIcon className="mr-1 h-4 w-4" /> Add Template
        </Button>
      </CardContent>
    </Card>
  );
}

export function OldNewSurveyForm({ ...props }: React.ComponentProps<"form">) {
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

  useEffect(() => {
    form.reset({ ...form.getValues(), residentIds: [] });
  }, [form.watch("facilityId")]);

  function onSubmit(values: SurveyCreateInputType) {
    toast.promise(createSurvey.mutateAsync(values), {
      loading: "Creating survey...",
      success: () => {
        form.reset({ ...form.getValues(), residentIds: [] });
        return `Successfully created survey`;
      },
      error: (e) => `Failed to create survey.`,
    });
  }

  return (
    <div className={cn("grid gap-2", props.className)}>
      <Form {...form}>
        <form className="grid gap-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="surveyorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <FormControl />
                <UserComboBox
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
        </form>
      </Form>

      {form.watch("facilityId") > -1 && (
        <>
          <AddResidentInput
            facilityId={form.getValues("facilityId")}
            value={form.getValues("residentIds")}
            onChange={(value: number[]) =>
              form.setValue("residentIds", Array.from(new Set(value)))
            }
          />
        </>
      )}

      {form.watch("facilityId") > -1 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary text-secondary-foreground">
                <TableHead className="w-[80px] text-right">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>PCCI ID</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.watch("residentIds").length < 1 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No residents selected. Add your first resident to get
                    started.
                  </TableCell>
                </TableRow>
              )}

              {form
                .watch("residentIds")
                .sort((curr, next) => (curr > next ? 1 : 0))
                .map((id) => (
                  <ResidentRowById
                    key={id}
                    id={id}
                    handleRemove={() => {
                      form.setValue(
                        "residentIds",
                        form.getValues("residentIds").filter((i) => i !== id) ||
                          [],
                      );
                    }}
                  />
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Due to nested form's issue had to split into different forms */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Button type="submit">Add</Button>
      </form>
    </div>
  );
}

function ResidentRowById({
  id,
  handleRemove,
}: {
  id: number;
  handleRemove: () => void;
}) {
  const apiUtils = api.useUtils();
  const resident = api.resident.byId.useQuery({ id });
  const deleteResident = api.resident.delete.useMutation();

  return (
    <TableRow>
      <TableCell className="text-right font-mono tabular-nums">{id}</TableCell>
      <TableCell className="font-medium">
        {!resident.data ? <Skeleton className="h-6" /> : resident.data.name}
      </TableCell>
      <TableCell className="font-medium">
        {!resident.data ? (
          <Skeleton className="h-6" />
        ) : (
          <FacilityHoverCard facility={resident.data.facility} />
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {!resident.data ? <Skeleton className="h-6" /> : resident.data.roomId}
        </Badge>
      </TableCell>
      <TableCell>
        {!resident.data ? (
          <Skeleton className="h-6" />
        ) : (
          <code className="bg-muted rounded px-2 py-1 text-xs">
            {resident.data.pcciId}
          </code>
        )}
      </TableCell>
      <TableCell className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={async () => {
            if (resident.data)
              toast("Delete resident?", {
                description: `This will permenantly delete ${resident.data.name} (PCCI ID: ${resident.data.pcciId})`,
                closeButton: true,
                action: {
                  label: "Yes",
                  onClick: () => {
                    toast.promise(deleteResident.mutateAsync({ id }), {
                      success: () => {
                        apiUtils.resident.byId.invalidate();
                        apiUtils.resident.list.invalidate();
                        handleRemove();
                        return <>Deleted Resident</>;
                      },
                    });
                  },
                },
              });
          }}
        >
          <Trash2Icon />
        </Button>
        <Button size="icon" variant="outline" onClick={handleRemove}>
          <XIcon />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddResidentInput({
  value,
  onChange,
  disabled,
  facilityId,
}: {
  value: number[];
  onChange: (e: number[]) => void;
  disabled?: boolean;
  facilityId: number;
}) {
  const apiUtils = api.useUtils();
  const form = useForm({
    resolver: zodResolver(residentInsertSchema.omit({ facilityId: true })),
    defaultValues: { name: "", pcciId: "", roomId: "" },
  });

  const pcciIdDebounce = useDebounce(form.watch("pcciId"), 500);

  const resident = api.resident.list.useQuery(
    {
      pcciId: pcciIdDebounce,
      pageSize: 1,
    },
    {
      select: (response) =>
        response.data?.find((e) => e.pcciId === form.watch("pcciId")),
    },
  );

  useEffect(() => {
    if (resident.data) {
      form.reset({ ...resident.data });
      return;
    }

    form.reset({
      pcciId: form.getValues("pcciId"),
      name: "",
      roomId: "",
    });
  }, [resident.data]);

  const residentMutation = api.resident.create.useMutation();

  function onSubmit(values: Omit<ResidentInsertType, "facilityId">) {
    if (!resident.data) {
      toast.promise(residentMutation.mutateAsync({ ...values, facilityId }), {
        loading: <>Creating resident...</>,
        success: async (response) => {
          if (response[0]) onChange([...value, response[0].id]);
          apiUtils.resident.invalidate();

          form.reset({});

          return `Successfully created resident ${values.name}`;
        },
        error: () => {
          return `Failed to create resident ${values.name}`;
        },
      });

      return;
    }

    if (resident.data.facilityId !== facilityId) {
      form.setError(
        "pcciId",
        {
          message: `Resident doesn't belong to this facility ${resident.data.facilityId}`,
        },
        { shouldFocus: true },
      );
      return;
    }
    onChange([...value, resident.data.id]);
  }

  return (
    <div className="rounded-xl border p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <h1 className="font-semibold">Resident</h1>
          <FormField
            name={"pcciId"}
            render={({ field }) => (
              <FormItem>
                <FormLabel>PCCI ID</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-2 lg:grid-cols-2">
            <FormField
              name={"name"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!resident.data} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={"roomId"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room ID</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!resident.data} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormItem>
            <FormLabel>Facility</FormLabel>
            <FacilityComboBox
              selectedItem={resident.data?.facilityId ?? facilityId}
              disabled
              onSelect={function (item: number): void {}}
            />
          </FormItem>

          <Button
            type="submit"
            variant="secondary"
            disabled={
              pcciIdDebounce !== form.watch("pcciId") || resident.isLoading
            }
          >
            <PlusIcon />
            Add Resident
          </Button>
        </form>
      </Form>
    </div>
  );
}

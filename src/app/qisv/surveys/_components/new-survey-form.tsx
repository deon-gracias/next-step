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
import { type SurveyCreateInputType } from "@/server/utils/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useEffect, useRef } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  residentInsertSchema,
  templateSelectSchema,
  type ResidentInsertType,
} from "@/server/db/schema";
import { CalendarIcon, PlusIcon, Trash2Icon, XIcon, UserIcon, ClipboardListIcon, UsersIcon } from "lucide-react";
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
import { authClient } from "@/components/providers/auth-client";
import { CasesMultiSelectComboBox } from "../../templates/_components/case-dropdown";

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
              template: templateSelectSchema.optional(),
              caseCodes: z.array(
                z.string().min(1, "Case code cannot be empty"),
              ),
              residentIds: z.array(
                z.number().min(1, "Resident ID must be at least 1"),
              ),
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
  const user = authClient.useSession();

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

  useEffect(() => {
    if (form.watch("surveyors").length > 0) return;
    if (!(user.data && user.data.user)) return;

    surveyorsField.append({
      surveyorId: user.data.user.id,
      templates: [],
    });
  }, [user.data]);

  const onSubmit = (values: NewMultiSurveyCreateInputType) => {
    const createSurveyRequest: SurveyCreateInputType[] = [];

    for (const surveyor of values.surveyors) {
      for (const template of surveyor.templates) {
        createSurveyRequest.push({
          surveyDate: values.surveyDate.toUTCString(),
          surveyorId: surveyor.surveyorId,
          facilityId: values.facilityId,
          templateId: template.template?.id,
          caseCodes: template.caseCodes,
          residentIds: template.residentIds,
        } as SurveyCreateInputType);
      }
    }

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
    <div className="space-y-6">
      {/* Main Form - Clean white background */}
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50/30 to-indigo-50/30">
        <CardHeader className="border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Survey Details</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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
                                "w-[240px] pl-3 text-left font-normal bg-white hover:bg-gray-50",
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
        </CardContent>
      </Card>

      {/* Surveyors Section */}
      <div className="space-y-4">
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
            className="w-full border-dashed border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
            onClick={() => {
              toast.success("Added new surveyor");
              surveyorsField.append({ surveyorId: "", templates: [] });
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Surveyor
          </Button>
        )}
      </div>

      {/* Submit Button */}
      <Card className="border-2 border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-green-50/50">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                size="lg"
                disabled={form.watch("facilityId") < 0}
              >
                Create Survey
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
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
    <Card 
      key={surveyor.id} 
      className="border-2 border-amber-100 bg-gradient-to-r from-amber-50/40 to-orange-50/40 shadow-sm"
    >
      <CardHeader className="border-b border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <UserIcon className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Surveyor {sIndex + 1}</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => surveyorsField.remove(sIndex)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Surveyor Select */}
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
        <div className="space-y-3">
          {templatesField.fields.map((template, tIndex) => (
            <Card 
              key={template.id}
              className="border border-purple-200 bg-gradient-to-r from-purple-50/50 to-violet-50/50 shadow-sm"
            >
              <CardHeader className="pb-3 border-b border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
                      <ClipboardListIcon className="h-3 w-3 text-purple-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Template {tIndex + 1}</h4>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => templatesField.remove(tIndex)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Template Select */}
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name={`surveyors.${sIndex}.templates.${tIndex}.template`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template</FormLabel>
                        <FormControl>
                          <TemplateComboBox
                            withValue
                            selectedItem={field.value}
                            onSelect={(item) => field.onChange(item)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                {/* Cases Section */}
                {form.watch("facilityId") > -1 &&
                  form.watch(`surveyors.${sIndex}.templates.${tIndex}.template`)?.type === "case" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name={`surveyors.${sIndex}.templates.${tIndex}.caseCodes`}
                        render={({ field }) => {
                          const ref = useRef<HTMLInputElement>(null);
                          return (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Cases</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input 
                                    ref={ref} 
                                    className="bg-white"
                                    placeholder="Enter case code"
                                  />
                                </FormControl>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="bg-slate-200 hover:bg-slate-300"
                                  onClick={() =>
                                    ref.current?.value &&
                                    field.onChange([
                                      ...field.value,
                                      ref.current?.value,
                                    ])
                                  }
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {field.value.map((e, i) => (
                                  <Badge variant="secondary" key={i} className="bg-slate-200">
                                    {e}
                                  </Badge>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </Form>
                  </div>
                )}

                {/* Residents Section */}
                {form.watch("facilityId") > -1 &&
                  form.watch(`surveyors.${sIndex}.templates.${tIndex}.template`)?.type === "resident" && (
                  <div className="space-y-3">
                    <AddResidentInput
                      facilityId={form.getValues("facilityId")}
                      value={form.getValues(`surveyors.${sIndex}.templates.${tIndex}.residentIds`)}
                      onChange={(value) =>
                        form.setValue(
                          `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                          Array.from(new Set(value)),
                        )
                      }
                    />

                    {/* Residents Table */}
                    <div className="rounded-lg border border-teal-200 bg-teal-50/30 overflow-hidden">
                      <div className="bg-teal-100/50 px-4 py-2 border-b border-teal-200">
                        <div className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4 text-teal-600" />
                          <span className="text-sm font-medium text-teal-800">Selected Residents</span>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-teal-50 hover:bg-teal-50">
                            <TableHead className="w-[80px] text-right text-teal-700">ID</TableHead>
                            <TableHead className="text-teal-700">Name</TableHead>
                            <TableHead className="text-teal-700">Facility</TableHead>
                            <TableHead className="text-teal-700">Room</TableHead>
                            <TableHead className="text-teal-700">PCCI ID</TableHead>
                            <TableHead className="text-teal-700"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {form.watch(`surveyors.${sIndex}.templates.${tIndex}.residentIds`).length < 1 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-muted-foreground py-8 text-center bg-white"
                              >
                                No residents selected. Add residents to get started.
                              </TableCell>
                            </TableRow>
                          )}

                          {form
                            .watch(`surveyors.${sIndex}.templates.${tIndex}.residentIds`)
                            .sort((curr, next) => (curr > next ? 1 : 0))
                            .map((id) => (
                              <ResidentRowById
                                key={id}
                                id={id}
                                handleRemove={() => {
                                  form.setValue(
                                    `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                                    form
                                      .getValues(`surveyors.${sIndex}.templates.${tIndex}.residentIds`)
                                      .filter((i) => i !== id),
                                  );
                                }}
                              />
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add Template Button */}
          <Button
            variant="outline"
            type="button"
            className="w-full border-dashed border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
            onClick={() =>
              templatesField.append({
                caseCodes: [],
                residentIds: [],
              })
            }
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Template
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <TableRow className="bg-white hover:bg-teal-50/50">
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
          className="h-7 w-7 hover:bg-red-50 hover:border-red-200"
          onClick={async () => {
            if (resident.data)
              toast("Delete resident?", {
                description: `This will permanently delete ${resident.data.name} (PCCI ID: ${resident.data.pcciId})`,
                closeButton: true,
                action: {
                  label: "Yes",
                  onClick: () => {
                    toast.promise(deleteResident.mutateAsync({ id }), {
                      success: () => {
                        void apiUtils.resident.byId.invalidate();
                        void apiUtils.resident.list.invalidate();
                        handleRemove();
                        return "Deleted Resident";
                      },
                    });
                  },
                },
              });
          }}
        >
          <Trash2Icon className="h-3 w-3" />
        </Button>
        <Button 
          size="icon" 
          variant="outline" 
          className="h-7 w-7 hover:bg-gray-50"
          onClick={handleRemove}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CaseRowsById({
  id,
  handleRemove,
}: {
  id: number;
  handleRemove: () => void;
}) {
  const cases = api.cases.byId.useQuery({ id });

  return (
    <TableRow>
      <TableCell className="text-right font-mono tabular-nums">{id}</TableCell>
      <TableCell className="tabular-nums">
        {!cases.data ? <Skeleton className="h-6" /> : cases.data.id}
      </TableCell>
      <TableCell className="font-medium">
        {!cases.data ? <Skeleton className="h-6" /> : cases.data.code}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {!cases.data ? <Skeleton className="h-6" /> : cases.data.description}
        </Badge>
      </TableCell>
      <TableCell className="flex items-center gap-2">
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
    resolver: zodResolver(residentInsertSchema),
    defaultValues: { name: "", pcciId: "", roomId: "", facilityId: 0 },
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
        loading: "Creating resident...",
        success: async (response) => {
          if (response[0]) onChange([...value, response[0].id]);
          void apiUtils.resident.invalidate();
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
    <Card className="border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
      <CardHeader className="pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
            <PlusIcon className="h-3 w-3 text-indigo-600" />
          </div>
          <h4 className="font-medium text-gray-900">Add Resident</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="pcciId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PCCI ID</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!resident.data} className="bg-white disabled:bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!resident.data} className="bg-white disabled:bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

<div className="hidden">
  <Input type="hidden" value={facilityId} />
</div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={
                pcciIdDebounce !== form.watch("pcciId") || resident.isLoading
              }
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Resident
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

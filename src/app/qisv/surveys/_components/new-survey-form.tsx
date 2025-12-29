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
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  residentInsertSchema,
  templateSelectSchema,
  type ResidentInsertType,
} from "@/server/db/schema";
import {
  CalendarIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
  UserIcon,
  ClipboardListIcon,
  UsersIcon,
  ChevronDownIcon,
  CheckIcon,
  FileTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  BuildingIcon,
  SaveIcon,
  AlertCircleIcon,
  TrashIcon,
  ChevronUpIcon,
} from "lucide-react";
import { FacilityHoverCard } from "../../_components/facility-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { authClient } from "@/components/providers/auth-client";
import { useLocalStorageForm } from "@/hooks/useLocalStorageForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const SURVEY_FORM_STORAGE_KEY = "survey-form-draft";

// Custom User Combobox Component with Fixed Search
function UserComboBox({
  selectedItem,
  onSelect,
}: {
  selectedItem?: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Get current organization ID from session
  const user = authClient.useSession();
  const currentOrgId = user.data?.session.activeOrganizationId;

  // Fetch users with search
  const users = api.user.listInOrg.useQuery(
    {
      organizationId: currentOrgId || "",
      page: 1,
      pageSize: 100,
      search: debouncedSearch,
    },
    {
      enabled: !!currentOrgId,
    },
  );

  const selectedUser = users.data?.find((user) => user.id === selectedItem);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                <UserIcon className="h-3 w-3 text-blue-600" />
              </div>
              <span className="truncate">
                {selectedUser.name || selectedUser.email}
              </span>
              {selectedUser.role && (
                <Badge variant="secondary" className="text-xs">
                  {selectedUser.role}
                </Badge>
              )}
            </div>
          ) : users.isLoading ? (
            "Loading users..."
          ) : (
            "Select user..."
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="border-b p-3">
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {users.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.data?.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center">
              {debouncedSearch
                ? "No users found matching your search."
                : "No users available."}
            </div>
          ) : (
            <div className="p-2">
              {users.data?.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-100",
                    selectedItem === user.id && "bg-blue-50",
                  )}
                  onClick={() => {
                    onSelect(user.id === selectedItem ? "" : user.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedItem === user.id
                        ? "text-blue-600 opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <UserIcon className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {user.name || "Unknown"}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </div>
                  </div>
                  {user.role && (
                    <Badge variant="secondary" className="text-xs">
                      {user.role}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Custom Facility Combobox Component with Fixed Search
function FacilityComboBox({
  selectedItem,
  onSelect,
}: {
  selectedItem?: number;
  onSelect: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const debouncedSearch = useDebounce(search, 300);

  // Fetch facilities with pagination and search
  const facilities = api.facility.list.useQuery({
    page: currentPage,
    pageSize,
    name: debouncedSearch,
  });

  // Fetch selected facility details if we have a selection
  const selectedFacility = api.facility.byId.useQuery(
    { id: selectedItem! },
    { enabled: !!selectedItem && selectedItem > -1 },
  );

  const totalPages = facilities.data?.totalPages || 1;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between rounded-full border-gray-300 bg-white/90 text-gray-600 backdrop-blur-sm hover:bg-white"
        >
          {selectedFacility.data ? (
            <span className="truncate text-gray-800">
              {selectedFacility.data.name}
            </span>
          ) : selectedItem !== undefined && selectedItem > -1 ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <span className="text-gray-400">Select Facility</span>
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full rounded-xl p-0" align="start">
        <div className="border-b p-3">
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg pl-9"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {facilities.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : facilities.data?.data.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center">
              {debouncedSearch
                ? "No facilities found matching your search."
                : "No facilities available."}
            </div>
          ) : (
            <div className="p-2">
              {facilities.data?.data.map((facility) => (
                <div
                  key={facility.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-gray-100",
                    selectedItem === facility.id && "bg-green-50",
                  )}
                  onClick={() => {
                    onSelect(facility.id === selectedItem ? -1 : facility.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      selectedItem === facility.id
                        ? "text-green-600 opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <BuildingIcon className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{facility.name}</div>
                    {facility.address && (
                      <div className="text-muted-foreground truncate text-xs">
                        {facility.address}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 bg-gray-100 text-xs text-gray-600"
                  >
                    ID: {facility.id}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={!hasPreviousPage || facilities.isLoading}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={!hasNextPage || facilities.isLoading}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {facilities.data && (
              <div className="text-muted-foreground mt-1 text-xs">
                Showing {facilities.data.data.length} of {facilities.data.total}{" "}
                facilities
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Template Combobox Component with exclusion logic
function TemplateComboBox({
  selectedItem,
  onSelect,
  withValue = false,
  excludeTemplateIds = [],
}: {
  selectedItem?: any;
  onSelect: (value: any) => void;
  withValue?: boolean;
  excludeTemplateIds?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 35;

  const debouncedSearch = useDebounce(search, 300);

  // Fetch templates with pagination and search
  const templates = api.template.list.useQuery({
    page: currentPage,
    pageSize,
    name: debouncedSearch,
  });

  // Filter out excluded templates and sort alphabetically
  const availableTemplates =
    templates.data?.data
      .filter((template) => !excludeTemplateIds.includes(template.id))
      .sort((a, b) => a.name.localeCompare(b.name)) || [];

  const totalPages = templates.data?.totalPages || 1;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "case":
        return "bg-orange-100 text-orange-700";
      case "resident":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between rounded-full border-gray-300 bg-white/90 text-gray-600 backdrop-blur-sm hover:bg-white"
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              <span className="truncate text-gray-800">
                {selectedItem.name}
              </span>
              <Badge
                variant="secondary"
                className={`text-xs ${getTypeBadgeColor(selectedItem.type)} flex-shrink-0`}
              >
                {selectedItem.type}
              </Badge>
            </div>
          ) : (
            <span className="text-gray-400">Select template...</span>
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full rounded-xl p-0" align="start">
        <div className="border-b p-3">
          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg pl-9"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {templates.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : availableTemplates.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center">
              {debouncedSearch
                ? "No templates found matching your search."
                : excludeTemplateIds.length > 0
                  ? "No more templates available. All others are already selected."
                  : "No templates available."}
            </div>
          ) : (
            <div className="p-2">
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-gray-100",
                    selectedItem?.id === template.id && "bg-blue-50",
                  )}
                  onClick={() => {
                    const newValue = withValue
                      ? template.id === selectedItem?.id
                        ? undefined
                        : template
                      : template.id === selectedItem?.id
                        ? undefined
                        : template.id;
                    onSelect(newValue);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedItem?.id === template.id
                        ? "text-blue-600 opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <FileTextIcon className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{template.name}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getTypeBadgeColor(template.type)}`}
                    >
                      {template.type}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      ID: {template.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={!hasPreviousPage || templates.isLoading}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={!hasNextPage || templates.isLoading}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {templates.data && (
              <div className="text-muted-foreground mt-1 text-xs">
                Showing {availableTemplates.length} of {templates.data.total}{" "}
                templates
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function NewSurveyForm({ ...props }: React.ComponentProps<"form">) {
  const user = authClient.useSession();

  // Get current organization ID from session
  const currentOrgId = user.data?.session.activeOrganizationId;

  // Fetch users for initial load
  const users = api.user.listInOrg.useQuery(
    {
      organizationId: currentOrgId || "",
      page: 1,
      pageSize: 100,
    },
    {
      enabled: !!currentOrgId,
      retry: 3,
      retryDelay: 1000,
    },
  );

  const createSurvey = api.survey.create.useMutation();

  const form = useForm<NewMultiSurveyCreateInputType>({
    resolver: zodResolver(newMultiSurveyCreateInputSchema),
    defaultValues: {
      surveyDate: new Date(),
      facilityId: -1,
      surveyors: [],
    },
  });

  // Initialize localStorage persistence
  const { clearStorage, loadFromStorage, saveToStorage } =
    useLocalStorageForm<NewMultiSurveyCreateInputType>(SURVEY_FORM_STORAGE_KEY);

  // State for showing save indicator
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // ✅ NEW: Add state for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const surveyorsField = useFieldArray({
    control: form.control,
    name: "surveyors",
  });

  // Load saved data on mount
  useEffect(() => {
    const savedData = loadFromStorage();
    if (savedData) {
      // Ensure data has proper defaults before resetting
      const formData: NewMultiSurveyCreateInputType = {
        surveyDate: savedData.surveyDate || new Date(),
        facilityId: savedData.facilityId ?? -1,
        surveyors: savedData.surveyors || [],
      };
      form.reset(formData);
    }
  }, [form, loadFromStorage]);

  // Save data when form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data && data.surveyDate && typeof data.facilityId === "number") {
        saveToStorage(data as NewMultiSurveyCreateInputType);
        setShowSavedIndicator(true);
        const timer = setTimeout(() => setShowSavedIndicator(false), 2000);
        return () => clearTimeout(timer);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, saveToStorage]);

  // Auto-select admin user and initialize surveyors
  useEffect(() => {
    if (form.watch("surveyors").length > 0) return;

    let defaultSurveyorId = "";

    // Try to find admin user first
    if (users.data && users.data.length > 0) {
      const adminUser = users.data.find(
        (u) =>
          u.role === "admin" ||
          u.email?.toLowerCase().includes("admin") ||
          u.name?.toLowerCase().includes("admin"),
      );

      if (adminUser) {
        defaultSurveyorId = adminUser.id;
      } else if (user.data?.user) {
        // Fallback to current user
        defaultSurveyorId = user.data.user.id;
      } else {
        // Fallback to first user
        defaultSurveyorId = users.data[0]?.id || "";
      }
    } else if (user.data?.user) {
      // If users list not loaded yet, use current user
      defaultSurveyorId = user.data.user.id;
    }

    if (defaultSurveyorId) {
      surveyorsField.append({
        surveyorId: defaultSurveyorId,
        templates: [],
      });
    }
  }, [user.data, users.data, surveyorsField, form]);

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

    // ✅ NEW: Function to actually create surveys (moved out of immediate execution)
    const executeSurveyCreation = async () => {
      async function createSurveys(survey: SurveyCreateInputType) {
        return await createSurvey.mutateAsync(survey);
      }

      toast.promise(
        Promise.all(createSurveyRequest.map((e) => createSurveys(e))),
        {
          loading: "Creating surveys",
          success: () => {
            clearStorage();

            const freshFormData: NewMultiSurveyCreateInputType = {
              surveyDate: new Date(),
              facilityId: -1,
              surveyors: [],
            };

            form.reset(freshFormData);
            surveyorsField.replace([]);

            return "Survey created successfully! Form has been cleared.";
          },
          error: () => "Failed to create survey.",
        },
      );
    };

    // ✅ NEW: Just open dialog, don't create yet
    setShowConfirmDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Draft Status Indicator */}
      <div className="sticky top-4 z-10">
        {showSavedIndicator && (
          <Alert className="animate-in slide-in-from-top-2 border-green-200 bg-green-50">
            <SaveIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Draft saved automatically
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Offline Protection Info + Clear Data Button */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="text-amber-800">
              <strong>Offline Protection:</strong> Your form data is
              automatically saved locally. Even if you refresh the page or lose
              internet connection, your progress won't be lost.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Clear localStorage
              clearStorage();

              // Reset form to fresh state
              const freshFormData: NewMultiSurveyCreateInputType = {
                surveyDate: new Date(),
                facilityId: -1,
                surveyors: [],
              };

              form.reset(freshFormData);
              surveyorsField.replace([]);

              // Show success message
              toast.success("All data cleared! Form has been reset.");
            }}
            className="border-red-200 whitespace-nowrap text-red-700 hover:border-red-300 hover:bg-red-50"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Clear All Data
          </Button>
        </div>
      </div>

      {/* Survey Details - Matching the dark blue header from screenshot */}
      {/* Survey Details - Header and fields on same line matching screenshot */}
      <Card className="overflow-hidden rounded-xl border-none bg-[#0C2152] shadow-lg">
        <CardContent className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex items-center gap-4">
                {/* Left side - Survey Details Header */}
                <div className="flex min-w-fit items-center gap-3">
                  <div className="rounded-lg bg-white/10 p-2">
                    <ClipboardListIcon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold whitespace-nowrap text-white">
                    Survey Details
                  </h2>
                </div>

                {/* Right side - Date and Facility fields */}
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="surveyDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "h-11 w-full rounded-full border-blue-200 bg-white/90 pl-3 text-left font-normal backdrop-blur-sm hover:bg-white",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span className="text-gray-400">
                                      Survey Date
                                    </span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
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
                      <FormItem className="flex flex-col">
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
                </div>
              </div>
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
          <button
            type="button"
            onClick={() => {
              const defaultSurveyorId = users.data?.[0]?.id || "";
              toast.success("Added new surveyor");
              surveyorsField.append({
                surveyorId: defaultSurveyorId,
                templates: [],
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0C2152] py-3 font-medium text-white shadow-md transition-all hover:bg-[#0C2152]"
          >
            <PlusIcon className="h-4 w-4" />
            Add Surveyor
          </button>
        )}
      </div>

      {/* Submit Button */}

      {/* Submit Button */}
      {/* Submit Button with Alert Dialog */}
      {/* Submit Button with Alert Dialog */}
      {/* Submit Button with Alert Dialog */}
      {/* Submit Button with Alert Dialog - UNCONTROLLED VERSION */}
      <AlertDialog>
        <Form {...form}>
          <div className="mt-16 mb-16 flex justify-center">
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={form.watch("facilityId") < 0}
                className="w-full max-w-md rounded-lg bg-[#ec553a] py-3 font-medium text-white shadow-md transition-all hover:bg-[#d64931]"
              >
                Create Survey
              </Button>
            </AlertDialogTrigger>
          </div>
        </Form>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Survey Creation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create this survey? This action will
              process all selected templates and surveyors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>

            <AlertDialogCancel className="ring-offset-background focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border-2 border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
              <button
                type="button"
                onClick={() => {
                  setTimeout(() => {
                    const values = form.getValues();
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

                    if (createSurveyRequest.length === 0) {
                      toast.error("No surveys to create");
                      return;
                    }

                    async function createSurveys(
                      survey: SurveyCreateInputType,
                    ) {
                      return await createSurvey.mutateAsync(survey);
                    }

                    toast.promise(
                      Promise.all(
                        createSurveyRequest.map((e) => createSurveys(e)),
                      ),
                      {
                        loading: "Creating surveys",
                        success: () => {
                          clearStorage();
                          const freshFormData: NewMultiSurveyCreateInputType = {
                            surveyDate: new Date(),
                            facilityId: -1,
                            surveyors: [],
                          };
                          form.reset(freshFormData);
                          surveyorsField.replace([]);
                          return "Survey created successfully! Form has been cleared.";
                        },
                        error: () => "Failed to create survey.",
                      },
                    );
                  }, 0);
                }}
              >
                Yes
              </button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// UPDATED: SurveyorField with template exclusion logic and conditional forms based on template type
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

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get all selected template IDs for this surveyor to exclude from dropdown
  const getExcludedTemplateIds = (currentTemplateIndex: number) => {
    // 1. Watch the entire surveyors array to get real-time updates
    const allSurveyors = form.watch("surveyors");

    // 2. Collect IDs from ALL surveyors
    const allSelectedIds = allSurveyors
      .flatMap((srv, srvIdx) =>
        srv.templates?.map((t, tIdx) => {
          // If we are looking at the specific row we are currently editing,
          // we allow that ID (return null) so it shows up as the selected value.
          // Otherwise, return the ID to add it to the exclusion list.
          const isCurrentRow =
            srvIdx === sIndex && tIdx === currentTemplateIndex;

          if (isCurrentRow) return null;
          return t.template?.id;
        }),
      )
      .filter((id): id is number => id != null && id !== undefined);

    return allSelectedIds;
  };

  return (
    <Card
      key={surveyor.id}
      className="overflow-hidden rounded-lg border-none bg-[#CCDEEA] shadow-sm"
    >
      <CardContent className="space-y-4 p-4">
        {/* Header and User field on same line - ALWAYS VISIBLE */}
        <div className="flex items-center gap-4">
          {/* Left side - Surveyor Header */}
          <div className="flex min-w-fit items-center gap-2">
            <div className="rounded-full bg-[#347aaa] p-2">
              <UserIcon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold whitespace-nowrap text-gray-800">
              Surveyor {sIndex + 1}
            </h3>
          </div>

          {/* Right side - User dropdown */}
          <div className="flex-1">
            <Form {...form}>
              <FormField
                control={form.control}
                name={`surveyors.${sIndex}.surveyorId`}
                render={({ field }) => (
                  <FormItem>
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
            </Form>
          </div>

          {/* Collapse/Remove buttons on far right */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-800"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronUpIcon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isCollapsed && "rotate-180",
                )}
              />
            </Button>
            {surveyorsField.fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={() => surveyorsField.remove(sIndex)}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Templates - ONLY show when NOT collapsed */}
        {!isCollapsed && (
          <div className="space-y-3">
            {templatesField.fields.map((template, tIndex) => (
              <TemplateCard
                key={template.id}
                form={form}
                sIndex={sIndex}
                tIndex={tIndex}
                templatesField={templatesField}
                getExcludedTemplateIds={getExcludedTemplateIds}
              />
            ))}

            {/* Add Template Button - Matching screenshot */}
            <button
              type="button"
              onClick={() =>
                templatesField.append({
                  caseCodes: [],
                  residentIds: [],
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#347aaa] bg-white py-3 text-sm font-medium text-[#347aaa]"
            >
              <PlusIcon className="h-4 w-4" />
              Add Template
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Separate Template Card Component
function TemplateCard({
  form,
  sIndex,
  tIndex,
  templatesField,
  getExcludedTemplateIds,
}: {
  form: UseFormReturn<NewMultiSurveyCreateInputType>;
  sIndex: number;
  tIndex: number;
  templatesField: any;
  getExcludedTemplateIds: (index: number) => number[];
}) {
  const caseInputRef = useRef<HTMLInputElement>(null);
  const selectedTemplate = form.watch(
    `surveyors.${sIndex}.templates.${tIndex}.template`,
  );

  return (
    <Card className="overflow-hidden rounded-lg border-none bg-[#347aaa] shadow-md">
      {/* Template Header with selector - Template text bigger, selector more to right */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Left - Template Icon and Title (BIGGER TEXT) */}
        <div className="flex min-w-[140px] items-center gap-2 text-white">
          <div className="rounded-full bg-white/20 p-1.5">
            <FileTextIcon className="h-4 w-4" />
          </div>
          <h4 className="text-base font-semibold">Template {tIndex + 1}</h4>
        </div>

        {/* Right - Template Selector (MORE SPACE) */}
        <div className="flex-1">
          <Form {...form}>
            <FormField
              control={form.control}
              name={`surveyors.${sIndex}.templates.${tIndex}.template`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TemplateComboBox
                      withValue
                      selectedItem={field.value}
                      onSelect={(item) => field.onChange(item)}
                      excludeTemplateIds={getExcludedTemplateIds(tIndex)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>

        {/* Far Right - Remove button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => templatesField.remove(tIndex)}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Template Content */}
      <div className="space-y-3 px-4 pb-4">
        {selectedTemplate && (
          <>
            {/* RESIDENT TYPE */}
            {selectedTemplate.type === "resident" && (
              <div className="grid grid-cols-[280px_1fr] gap-3">
                {/* LEFT COLUMN - Selected Residents Box (WIDER + BIGGER TEXT) */}
                <div className="min-h-[140px] self-start rounded-lg bg-white/90 p-3">
                  <div className="mb-2 border-b border-gray-300 pb-1 text-sm font-semibold text-gray-600">
                    Selected Residents
                  </div>
                  {form.watch(
                    `surveyors.${sIndex}.templates.${tIndex}.residentIds`,
                  ).length < 1 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      No residents selected
                    </div>
                  ) : (
                    <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700">
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
                            compact={true}
                          />
                        ))}
                    </ul>
                  )}
                </div>

                {/* RIGHT COLUMN - Add Resident with Search */}
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
              </div>
            )}

            {/* CASE TYPE */}
            {selectedTemplate.type === "case" && (
              <Form {...form}>
                <FormField
                  control={form.control}
                  name={`surveyors.${sIndex}.templates.${tIndex}.caseCodes`}
                  render={({ field }) => {
                    return (
                      <div className="grid grid-cols-[280px_1fr] gap-3">
                        {/* LEFT COLUMN - Cases Box (WIDER + BIGGER TEXT) */}
                        <div className="min-h-[140px] self-start rounded-lg bg-white/90 p-3">
                          <div className="mb-2 border-b border-gray-300 pb-1 text-sm font-semibold text-gray-600">
                            Cases
                          </div>
                          {field.value && field.value.length > 0 ? (
                            <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700">
                              {field.value.map((code, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center justify-between"
                                >
                                  <span>{code}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(
                                        field.value.filter((_, i) => i !== idx),
                                      );
                                      toast.success(
                                        "Case removed successfully!",
                                      );
                                    }}
                                    className="ml-2 text-gray-400 transition-colors hover:text-gray-600"
                                  >
                                    <XIcon className="h-3.5 w-3.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="py-6 text-center text-sm text-gray-400">
                              No cases added
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN - Input and Button */}
                        <div className="space-y-2">
                          <Input
                            ref={caseInputRef}
                            placeholder="Enter Case Number"
                            className="h-10 w-full rounded-lg border-gray-300 bg-white/90 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (
                                  caseInputRef.current?.value &&
                                  caseInputRef.current.value.trim()
                                ) {
                                  field.onChange([
                                    ...field.value,
                                    caseInputRef.current.value.trim(),
                                  ]);
                                  caseInputRef.current.value = "";
                                  toast.success("Case added successfully!");
                                }
                              }
                            }}
                          />

                          {/* Add Case Button - SAME COLOR AS RESIDENT BUTTON */}
                          <Button
                            type="button"
                            className="h-10 w-full rounded-lg bg-gray-500 text-sm font-medium text-white shadow-sm hover:bg-gray-600"
                            onClick={() => {
                              if (
                                caseInputRef.current?.value &&
                                caseInputRef.current.value.trim()
                              ) {
                                field.onChange([
                                  ...field.value,
                                  caseInputRef.current.value.trim(),
                                ]);
                                caseInputRef.current.value = "";
                                toast.success("Case added successfully!");
                              } else {
                                toast.error("Please enter a case number");
                              }
                            }}
                          >
                            + Add Case
                          </Button>
                        </div>
                      </div>
                    );
                  }}
                />
              </Form>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ResidentRowById component - only cross icon for removal
// ResidentRowById component - showing name, room, and PCC ID
function ResidentRowById({
  id,
  handleRemove,
  compact = false,
}: {
  id: number;
  handleRemove: () => void;
  compact?: boolean;
}) {
  const resident = api.resident.byId.useQuery({ id });

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  if (compact) {
    // Compact view for selected residents - includes PCC ID with initials
    return (
      <div className="flex items-center gap-2 rounded-md bg-blue-50 p-2">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100">
          <UserIcon className="h-2 w-2 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          {!resident.data ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <div className="text-xs">
              <span className="font-medium">
                PCC ID:{" "}
                {resident.data.pcciId || getInitials(resident.data.name || "")}{" "}
                - Room {resident.data.roomId || "N/A"}
              </span>
            </div>
          )}
        </div>
        {/* Only cross icon, no delete button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 hover:bg-red-100"
          onClick={handleRemove}
        >
          <XIcon className="h-2 w-2" />
        </Button>
      </div>
    );
  }

  // Original table row view (not used in this context)
  return null;
}

// AddResidentInput component with PCC ID, Name, Room ID on same line
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
  const [searchedResident, setSearchedResident] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(residentInsertSchema),
    defaultValues: { name: "", pcciId: "", roomId: "", facilityId: 0 },
  });

  const residentMutation = api.resident.create.useMutation();

  // Manual search function
  const handleSearchResident = async () => {
    const pcciId = form.getValues("pcciId");

    if (!pcciId || pcciId.trim().length === 0) {
      toast.error("Please enter a PCC ID to search");
      return;
    }

    try {
      const response = await apiUtils.client.resident.list.query({
        pcciId: pcciId.trim(),
        pageSize: 10,
        page: 1,
        facilityId: facilityId,
      });

      const foundResident = response.data?.find(
        (e) => e.pcciId === pcciId.trim(),
      );

      if (foundResident) {
        // Check if resident belongs to the selected facility
        if (foundResident.facilityId !== facilityId) {
          form.setError("pcciId", {
            message: `Resident belongs to different facility (Facility ID: ${foundResident.facilityId})`,
          });
          setSearchedResident(null);
          return;
        }

        // Fill the form with found resident details
        form.setValue("name", foundResident.name || "");
        form.setValue("roomId", foundResident.roomId || "");
        form.setValue("facilityId", foundResident.facilityId);
        form.clearErrors("pcciId");
        setSearchedResident(foundResident);
        toast.success(`Found resident: ${foundResident.name}`);
      } else {
        // Clear form if no resident found
        form.setValue("name", "");
        form.setValue("roomId", "");
        form.setValue("facilityId", facilityId);
        setSearchedResident(null);
        toast.info(
          "No resident found with this PCC ID. You can create a new one.",
        );
      }
    } catch (error) {
      console.error("Error searching for resident:", error);
      toast.error("Error searching for resident. Please try again.");
      setSearchedResident(null);
    }
  };

  function onSubmit(values: Omit<ResidentInsertType, "facilityId">) {
    if (!searchedResident) {
      // Create new resident
      toast.promise(residentMutation.mutateAsync({ ...values, facilityId }), {
        loading: "Creating resident...",
        success: async (response) => {
          if (response[0]) onChange([...value, response[0].id]);
          void apiUtils.resident.invalidate();
          form.reset({ name: "", pcciId: "", roomId: "", facilityId: 0 });
          setSearchedResident(null);
          return `Successfully created resident ${values.name}`;
        },
        error: () => {
          return `Failed to create resident ${values.name}`;
        },
      });
      return;
    }

    // Check if resident already added
    if (value.includes(searchedResident.id)) {
      toast.error("This resident is already added");
      return;
    }

    // Add existing resident
    onChange([...value, searchedResident.id]);
    form.reset({ name: "", pcciId: "", roomId: "", facilityId: 0 });
    setSearchedResident(null);
    toast.success(`Added ${searchedResident.name} to the survey`);
  }

  // Clear searched resident when PCC ID changes
  const handlePcciIdChange = (value: string) => {
    form.setValue("pcciId", value);
    if (searchedResident && searchedResident.pcciId !== value) {
      setSearchedResident(null);
      form.setValue("name", "");
      form.setValue("roomId", "");
    }
  };

  return (
    <Card className="border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
      <CardHeader className="border-b border-indigo-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
            <PlusIcon className="h-3 w-3 text-indigo-600" />
          </div>
          <h4 className="font-medium text-gray-900">Add Resident</h4>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* All three fields in one row */}
            <div className="flex gap-2">
              <FormField
                name="pcciId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-sm">PCC ID *</FormLabel>
                    <FormControl>
                      <div className="flex gap-1">
                        <Input
                          {...field}
                          onChange={(e) => handlePcciIdChange(e.target.value)}
                          className="h-8 bg-white"
                          placeholder="Enter PCC ID"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSearchResident}
                          disabled={
                            !field.value || field.value.trim().length === 0
                          }
                          className="h-8 border-blue-200 bg-blue-50 px-2 hover:bg-blue-100"
                        >
                          <SearchIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-sm">Initials</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!!searchedResident}
                        className="h-8 bg-white disabled:bg-gray-50"
                        placeholder="Resident Initials"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="roomId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-sm">Room No. *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!!searchedResident}
                        className="h-8 bg-white disabled:bg-gray-50"
                        placeholder="Room number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {searchedResident && (
              <p className="text-xs text-green-600">
                ✓ Resident found: {searchedResident.name} (Room:{" "}
                {searchedResident.roomId})
              </p>
            )}

            <input type="hidden" value={facilityId} />

            <Button
              type="submit"
              className="h-10 w-full rounded-lg bg-gray-500 text-sm font-medium text-white shadow-sm hover:bg-gray-600"
              disabled={
                residentMutation.isPending ||
                !(form.watch("pcciId")?.trim?.().length > 0) ||
                !(String(form.watch("roomId") ?? "").trim().length > 0)
              }
            >
              {searchedResident
                ? "Add Existing Resident"
                : "Create & Add Resident"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

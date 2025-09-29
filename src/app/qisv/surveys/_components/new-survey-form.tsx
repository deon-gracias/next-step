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
  SaveIcon,  // ✅ Added for save indicator
  AlertCircleIcon,  // ✅ Added for info alert
  TrashIcon
} from "lucide-react";
import { FacilityHoverCard } from "../../_components/facility-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";  // ✅ Added for alerts

import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { authClient } from "@/components/providers/auth-client";
import { useLocalStorageForm } from "@/hooks/useLocalStorageForm";  // ✅ Added localStorage hook

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

// ✅ Storage key for localStorage
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
  const users = api.user.listInOrg.useQuery({
    organizationId: currentOrgId || "",
    page: 1,
    pageSize: 100,
    search: debouncedSearch,
  }, {
    enabled: !!currentOrgId,
  });

  const selectedUser = users.data?.find(user => user.id === selectedItem);

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
              <span className="truncate">{selectedUser.name || selectedUser.email}</span>
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
        <div className="p-3 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <div className="p-4 space-y-2">
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
            <div className="p-4 text-center text-muted-foreground">
              {debouncedSearch ? "No users found matching your search." : "No users available."}
            </div>
          ) : (
            <div className="p-2">
              {users.data?.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md",
                    selectedItem === user.id && "bg-blue-50"
                  )}
                  onClick={() => {
                    onSelect(user.id === selectedItem ? "" : user.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedItem === user.id ? "opacity-100 text-blue-600" : "opacity-0"
                    )}
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <UserIcon className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
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
    { enabled: !!selectedItem && selectedItem > -1 }
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
          className="w-full justify-between bg-white"
        >
          {selectedFacility.data ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <BuildingIcon className="h-3 w-3 text-green-600" />
              </div>
              <span className="truncate">{selectedFacility.data.name}</span>
              <Badge variant="secondary" className="text-xs">
                ID: {selectedFacility.data.id}
              </Badge>
            </div>
          ) : selectedItem !== undefined && selectedItem > -1 ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            "Select facility..."
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="p-3 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {facilities.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : facilities.data?.data.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {debouncedSearch ? "No facilities found matching your search." : "No facilities available."}
            </div>
          ) : (
            <div className="p-2">
              {facilities.data?.data.map((facility) => (
                <div
                  key={facility.id}
                  className={cn(
                    "flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md",
                    selectedItem === facility.id && "bg-green-50"
                  )}
                  onClick={() => {
                    onSelect(facility.id === selectedItem ? -1 : facility.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedItem === facility.id ? "opacity-100 text-green-600" : "opacity-0"
                    )}
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <BuildingIcon className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{facility.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {facility.id} • {facility.address || "No address"}
                    </div>
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
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!hasPreviousPage || facilities.isLoading}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={!hasNextPage || facilities.isLoading}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {facilities.data && (
              <div className="text-xs text-muted-foreground mt-1">
                Showing {facilities.data.data.length} of {facilities.data.total} facilities
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Custom Template Combobox Component with Fixed Search
function TemplateComboBox({
  selectedItem,
  onSelect,
  withValue = false,
}: {
  selectedItem?: any;
  onSelect: (value: any) => void;
  withValue?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const debouncedSearch = useDebounce(search, 300);

  // Fetch templates with pagination and search
  const templates = api.template.list.useQuery({
    page: currentPage,
    pageSize,
    name: debouncedSearch,
  });

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
      case 'case':
        return 'bg-orange-100 text-orange-700';
      case 'resident':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white"
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
                <FileTextIcon className="h-3 w-3 text-purple-600" />
              </div>
              <span className="truncate">{selectedItem.name}</span>
              <Badge variant="secondary" className={`text-xs ${getTypeBadgeColor(selectedItem.type)}`}>
                {selectedItem.type}
              </Badge>
            </div>
          ) : (
            "Select template..."
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="p-3 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {templates.isLoading ? (
            <div className="p-4 space-y-2">
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
          ) : templates.data?.data.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {debouncedSearch ? "No templates found matching your search." : "No templates available."}
            </div>
          ) : (
            <div className="p-2">
              {templates.data?.data.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md",
                    selectedItem?.id === template.id && "bg-purple-50"
                  )}
                  onClick={() => {
                    const newValue = withValue
                      ? (template.id === selectedItem?.id ? undefined : template)
                      : (template.id === selectedItem?.id ? undefined : template.id);
                    onSelect(newValue);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "h-4 w-4",
                      selectedItem?.id === template.id ? "opacity-100 text-purple-600" : "opacity-0"
                    )}
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
                    <FileTextIcon className="h-3 w-3 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{template.name}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getTypeBadgeColor(template.type)}`}
                    >
                      {template.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: {template.id}</span>
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
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!hasPreviousPage || templates.isLoading}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={!hasNextPage || templates.isLoading}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {templates.data && (
              <div className="text-xs text-muted-foreground mt-1">
                Showing {templates.data.data.length} of {templates.data.total} templates
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
  const users = api.user.listInOrg.useQuery({
    organizationId: currentOrgId || "",
    page: 1,
    pageSize: 100,
  }, {
    enabled: !!currentOrgId,
    retry: 3,
    retryDelay: 1000,
  });

  const createSurvey = api.survey.create.useMutation();

  const form = useForm<NewMultiSurveyCreateInputType>({
    resolver: zodResolver(newMultiSurveyCreateInputSchema),
    defaultValues: {
      surveyDate: new Date(),
      facilityId: -1,
      surveyors: [],
    },
  });

  // ✅ Initialize localStorage persistence
  const { clearStorage, loadFromStorage, saveToStorage } = useLocalStorageForm<NewMultiSurveyCreateInputType>(
    SURVEY_FORM_STORAGE_KEY
  );

  // ✅ State for showing save indicator
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const surveyorsField = useFieldArray({
    control: form.control,
    name: "surveyors",
  });

  // ✅ Load saved data on mount
  // ✅ Load saved data on mount
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


  // ✅ Save data when form changes
  // ✅ Save data when form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data && data.surveyDate && typeof data.facilityId === 'number') {
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
      const adminUser = users.data.find(u =>
        u.role === "admin" ||
        u.email?.toLowerCase().includes("admin") ||
        u.name?.toLowerCase().includes("admin")
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

    async function createSurveys(survey: SurveyCreateInputType) {
      return await createSurvey.mutateAsync(survey);
    }

    toast.promise(
      Promise.all(createSurveyRequest.map((e) => createSurveys(e))),
      {
        loading: "Creating surveys",
        success: () => {
          // ✅ Clear localStorage FIRST - completely remove all saved data
          clearStorage();

          // ✅ Reset form to completely fresh state
          const freshFormData: NewMultiSurveyCreateInputType = {
            surveyDate: new Date(),
            facilityId: -1, // Reset to default "not selected" state
            surveyors: [], // Start with empty surveyors array
          };

          form.reset(freshFormData);

          // ✅ Force surveyors field to be completely empty initially
          surveyorsField.replace([]);

          // ✅ Show success message
          return "Survey created successfully! Form has been cleared.";
        },
        error: () => "Failed to create survey.",
      },
    );

  };

  return (
    <div className="space-y-6">
      {/* ✅ Draft Status Indicator */}
      <div className="sticky top-4 z-10">
        {showSavedIndicator && (
          <Alert className="bg-green-50 border-green-200 animate-in slide-in-from-top-2">
            <SaveIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Draft saved automatically
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* ✅ Offline Protection Info + Clear Data Button */}
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="flex items-start gap-3">
      <AlertCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-amber-800">
        <strong>Offline Protection:</strong> Your form data is automatically saved locally. 
        Even if you refresh the page or lose internet connection, your progress won't be lost.
      </div>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        // ✅ Clear localStorage
        clearStorage();
        
        // ✅ Reset form to fresh state
        const freshFormData: NewMultiSurveyCreateInputType = {
          surveyDate: new Date(),
          facilityId: -1,
          surveyors: [],
        };
        
        form.reset(freshFormData);
        surveyorsField.replace([]);
        
        // ✅ Show success message
        toast.success("All data cleared! Form has been reset.");
      }}
      className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 whitespace-nowrap"
    >
      <TrashIcon className="h-4 w-4 mr-2" />
      Clear All Data
    </Button>
  </div>
</div>




      {/* Main Form - EXACTLY as your original */}
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
                            // disabled={(date) => date < new Date()}
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

      {/* Surveyors Section - EXACTLY as your original */}
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
              const defaultSurveyorId = users.data?.[0]?.id || "";
              toast.success("Added new surveyor");
              surveyorsField.append({ surveyorId: defaultSurveyorId, templates: [] });
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Surveyor
          </Button>
        )}
      </div>

      {/* Submit Button - EXACTLY as your original */}
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

// Keep ALL your original components EXACTLY as they are...
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
                    selectedItem={field.value}
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
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="bg-slate-200 hover:bg-slate-300"
                                    onClick={() => {
                                      if (ref.current?.value && ref.current.value.trim()) {
                                        field.onChange([
                                          ...field.value,
                                          ref.current.value.trim(),
                                        ]);
                                        ref.current.value = "";
                                      }
                                    }}
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {field.value.map((e, i) => (
                                    <Badge
                                      variant="secondary"
                                      key={i}
                                      className="bg-slate-200 cursor-pointer hover:bg-slate-300"
                                      onClick={() => {
                                        field.onChange(field.value.filter((_, index) => index !== i));
                                      }}
                                    >
                                      {e} <XIcon className="h-3 w-3 ml-1" />
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
                              <TableHead className="text-teal-700">PCC ID</TableHead>
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
                description: `This will permanently delete ${resident.data.name} (PCC ID: ${resident.data.pcciId})`,
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

  // Manual search function - CORRECTED
  const handleSearchResident = async () => {
    const pcciId = form.getValues("pcciId");

    if (!pcciId || pcciId.trim().length === 0) {
      toast.error("Please enter a PCC ID to search");
      return;
    }

    try {
      // Use apiUtils.client to call the tRPC procedure correctly
      const response = await apiUtils.client.resident.list.query({
        pcciId: pcciId.trim(),
        pageSize: 10,
        page: 1,
        facilityId: facilityId, // Add facility filter to search
      });

      const foundResident = response.data?.find((e) => e.pcciId === pcciId.trim());

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
        toast.info("No resident found with this PCC ID. You can create a new one.");
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
          form.reset({});
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
    form.reset({});
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
                  <FormLabel>PCC ID</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        {...field}
                        onChange={(e) => handlePcciIdChange(e.target.value)}
                        className="bg-white"
                        placeholder="Enter PCC ID"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchResident}
                        disabled={!field.value || field.value.trim().length === 0}
                        className="min-w-[100px] bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <SearchIcon className="mr-2 h-4 w-4" />
                        Search
                      </Button>
                    </div>
                  </FormControl>
                  {searchedResident && (
                    <p className="text-xs text-green-600">
                      ✓ Resident found: {searchedResident.name} (Room: {searchedResident.roomId})
                    </p>
                  )}
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
                      <Input
                        {...field}
                        disabled={!!searchedResident}
                        className="bg-white disabled:bg-gray-50"
                        placeholder="Resident name"
                      />
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
                      <Input
                        {...field}
                        disabled={!!searchedResident}
                        className="bg-white disabled:bg-gray-50"
                        placeholder="Room number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <input type="hidden" value={facilityId} />

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={
                !form.watch("pcciId") ||
                !form.watch("name") ||
                residentMutation.isPending
              }
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {searchedResident ? "Add Existing Resident" : "Create & Add Resident"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

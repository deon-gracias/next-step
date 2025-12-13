"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { QISVHeader } from "../../_components/header";
import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Lock,
  Unlock,
  MessageCircle,
  Send,
  User,
  Clock,
  Download,
  Calendar,
  AlertTriangle,
  Users,
  FileText,
  Tag,
  BuildingIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ftag } from "@/server/db/schema";
import { authClient } from "@/components/providers/auth-client";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";

// ✅ UI permission mapping
import { canUI, type AppRole } from "@/lib/ui-permissions";

type StatusVal = "met" | "unmet" | "not_applicable";
type ResponseCell = { status: StatusVal | null; findings: string | null };
type QuestionRow = {
  id: number;
  text: string;
  points?: number;
  ftags?: { code: string }[];
};

type QuestionStrength = {
  questionId: number;
  text: string;
  points: number;
  strengthPct: number;
  metCount: number;
  unmetCount: number;
  naCount: number;
  ftags: { id: number; code: string; description: string }[];
};

// ✅ Add normalizeRole function
function normalizeRole(role: unknown): AppRole | null {
  const r = String(role ?? "")
    .toLowerCase()
    .trim();
  if (r === "owner") return "admin";
  if (r === "admin") return "admin";
  if (r === "member") return "viewer";
  if (
    r === "viewer" ||
    r === "lead_surveyor" ||
    r === "surveyor" ||
    r === "facility_coordinator" ||
    r === "facility_viewer" ||
    r === "admin"
  ) {
    return r as AppRole;
  }
  return null;
}

// Helper component to display facility information
const FacilityInfo = ({ facilityId }: { facilityId: number }) => {
  const facility = api.facility.byId.useQuery({ id: facilityId }, { enabled: facilityId > 0 });

  if (facility.isPending) {
    return (
      <div className="flex items-center gap-2">
        <BuildingIcon className="h-4 w-4 text-green-600" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <BuildingIcon className="h-4 w-4 text-green-600" />
      <span>{facility.data?.name || `Facility ID: ${facilityId}`}</span>
    </div>
  );
};

// Helper component to display surveyor information
const SurveyorInfo = ({ surveyorId }: { surveyorId: string }) => {
  const surveyor = api.user.byId.useQuery({ id: surveyorId }, { enabled: Boolean(surveyorId) });

  if (surveyor.isPending) {
    return (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-blue-600" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-blue-600" />
      <span>{surveyor.data?.name || surveyor.data?.email || `User ID: ${surveyorId}`}</span>
    </div>
  );
};

// Move CommentsSection outside the main component
const CommentsSection = ({
  comments,
  showComments,
  setShowComments,
  newComment,
  setNewComment,
  handleAddComment,
  addComment,
}: {
  comments: any;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleAddComment: () => void;
  addComment: any;
}) => (
  <div className="border-t bg-slate-50/50 mt-6 pt-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-900">Discussion</span>
          {comments.data && comments.data.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800">
              {comments.data.length} comment{comments.data.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="text-gray-600 hover:text-gray-900"
      >
        {showComments ? "Hide" : "Show"} Comments
      </Button>
    </div>

    {showComments && (
      <div className="space-y-4">
        <div className="max-h-60 overflow-y-auto space-y-3 bg-white rounded-lg border p-4">
          {comments.data && comments.data.length > 0 ? (
            comments.data.map((comment: any) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 border">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author ? comment.author.name : "Unknown User"}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {comment.createdAt &&
                        format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{comment.commentText}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No comments yet. Start the discussion!</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add your comment here..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            disabled={addComment.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addComment.isPending}
            size="sm"
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
);

export default function SurveyDetailPage() {
  const params = useParams();
  const surveyId = Number((params as any).surveyId);

  // Data - fetch residents for all template types
  const survey = api.survey.byId.useQuery({ id: surveyId });
  const residents = api.survey.listResidents.useQuery({ surveyId });
  const cases = api.survey.listCases.useQuery({ surveyId });

  // Fetch facility and surveyor data separately
  const facility = api.facility.byId.useQuery(
    { id: survey.data?.facilityId ?? -1 },
    { enabled: Boolean(survey.data?.facilityId) }
  );

  const surveyor = api.user.byId.useQuery(
    { id: survey.data?.surveyorId ?? "" },
    { enabled: Boolean(survey.data?.surveyorId) }
  );

  const surveyCompletion = api.survey.checkCompletion.useQuery(
    { surveyId },
    {
      enabled: Boolean(surveyId),
      refetchInterval: 3000,
    }
  );

  // Get ALL questions without pagination
  const questions = api.question.list.useQuery(
    { templateId: survey.data?.templateId ?? -1 },
    { enabled: Boolean(survey.data?.templateId) }
  );

  const questionIds = (questions.data ?? []).map((q) => q.id);

  const ftagsBatch = api.question.getFtagsByQuestionIds.useQuery(
    { questionIds },
    { enabled: questionIds.length > 0 }
  );

  const ftagsMap = React.useMemo(() => {
    const m = new Map<number, { id: number; code: string; description: string }[]>();
    if (ftagsBatch.data) {
      for (const row of ftagsBatch.data) {
        m.set(row.questionId, row.ftags);
      }
    }
    return m;
  }, [ftagsBatch.data]);

  // Comments
  const comments = api.pocComment.list.useQuery(
    {
      surveyId: surveyId,
      templateId: survey.data?.templateId ?? -1,
    },
    { enabled: Boolean(survey.data?.templateId) }
  );

  // Mutations
  const utils = api.useUtils();
  const lockSurvey = api.survey.lock.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("Survey locked");
    },
    onError: (e) => toast.error((e as { message?: string })?.message ?? "Failed to lock survey"),
  });
  const unlockSurvey = api.survey.unlock.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("Survey unlocked");
    },
    onError: (e) => toast.error((e as { message?: string })?.message ?? "Failed to unlock survey"),
  });

  const markPocGenerated = api.survey.markPocGenerated.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      toast.success("POC generation enabled successfully");
    },
    onError: (e) =>
      toast.error((e as { message?: string })?.message ?? "Failed to enable POC generation"),
  });

  const pocUpsert = api.poc.upsert.useMutation();
  const docUpsert = api.doc.upsert.useMutation();
  const addComment = api.pocComment.create.useMutation({
    onSuccess: async () => {
      await utils.pocComment.list.invalidate({ surveyId, templateId: survey.data?.templateId ?? -1 });
      setNewComment("");
      toast.success("Comment added successfully");
    },
    onError: (e) => toast.error("Failed to add comment"),
  });

  // Local state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [combinedPOC, setCombinedPOC] = useState("");
  const [hasAnyPOC, setHasAnyPOC] = useState(false);
  const [pocMap, setPocMap] = useState<Map<string, string>>(new Map());

  const [combinedDOC, setCombinedDOC] = useState<Date | null>(null);
  const [hasAnyDOC, setHasAnyDOC] = useState(false);
  const [docMap, setDocMap] = useState<Map<string, Date>>(new Map());

  const [allResponses, setAllResponses] = useState<
    Array<{
      residentId: number | null;
      surveyCaseId: number | null;
      questionId: number;
      status: StatusVal | null;
      findings: string | null;
    }>
  >([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [editSurveyorOpen, setEditSurveyorOpen] = useState(false);
  const [editResidentsOpen, setEditResidentsOpen] = useState(false);

  const [editCasesOpen, setEditCasesOpen] = useState(false);
  const [newCaseCode, setNewCaseCode] = useState("");
  const mutationCountRef = useRef(0);

  const [manageSurveyDialogOpen, setManageSurveyDialogOpen] = useState(false);
  const [selectedSurveyorId, setSelectedSurveyorId] = useState<string>("");
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("surveyor");

  const pdfContentRef = useRef<HTMLDivElement>(null);

  const updateSurveyor = api.survey.updateSurveyor.useMutation({
    onSuccess: async () => {
      await utils.survey.byId.invalidate({ id: surveyId });
      setManageSurveyDialogOpen(false);
      toast.success("Surveyor updated successfully");
    },
    onError: (e) => toast.error(e.message ?? "Failed to update surveyor"),
  });

  const addResident = api.survey.addResident.useMutation({
    onSuccess: async () => {
      await utils.survey.listResidents.invalidate({ surveyId });
      setSelectedResidentId(null);
      setManageSurveyDialogOpen(false);
      toast.success("Resident added successfully");
    },
    onError: (e) => toast.error(e.message ?? "Failed to add resident"),
  });

  const removeResident = api.survey.removeResident.useMutation({
    onMutate: async (deletedResident) => {
      mutationCountRef.current += 1;
      await utils.survey.listResidents.cancel({ surveyId });
      const previousResidents = utils.survey.listResidents.getData({ surveyId });
      utils.survey.listResidents.setData({ surveyId }, (old) =>
        old?.filter((r) => r.residentId !== deletedResident.residentId)
      );
      return { previousResidents };
    },
    onError: (err, deletedResident, context) => {
      mutationCountRef.current -= 1;
      utils.survey.listResidents.setData({ surveyId }, context?.previousResidents);
      setTimeout(() => {
        toast.error(err.message ?? "Failed to remove resident");
      }, 100);
    },
    onSuccess: () => {
      mutationCountRef.current -= 1;
      setManageSurveyDialogOpen(false);
      setTimeout(() => {
        toast.success("Resident removed successfully");
      }, 100);
    },
    onSettled: () => {
      if (mutationCountRef.current === 0) {
        utils.survey.listResidents.invalidate({ surveyId });
        utils.survey.checkCompletion.invalidate({ surveyId });
      }
    },
  });

  const addCase = api.survey.addCase.useMutation({
    onSuccess: async () => {
      await utils.survey.listCases.invalidate({ surveyId });
      setManageSurveyDialogOpen(false);
      toast.success("Case added successfully");
    },
    onError: (e) => toast.error(e.message ?? "Failed to add case"),
  });

  const removeCase = api.survey.removeCase.useMutation({
    onMutate: async (deletedCase) => {
      mutationCountRef.current += 1;
      await utils.survey.listCases.cancel({ surveyId });
      const previousCases = utils.survey.listCases.getData({ surveyId });
      utils.survey.listCases.setData({ surveyId }, (old) =>
        old?.filter((c) => c.id !== deletedCase.caseId)
      );
      return { previousCases };
    },
    onError: (err, deletedCase, context) => {
      mutationCountRef.current -= 1;
      utils.survey.listCases.setData({ surveyId }, context?.previousCases);
      setTimeout(() => {
        toast.error(err.message ?? "Failed to remove case");
      }, 100);
    },
    onSuccess: () => {
      mutationCountRef.current -= 1;
      setManageSurveyDialogOpen(false);
      setTimeout(() => {
        toast.success("Case removed successfully");
      }, 100);
    },
    onSettled: () => {
      if (mutationCountRef.current === 0) {
        utils.survey.listCases.invalidate({ surveyId });
        utils.survey.checkCompletion.invalidate({ surveyId });
      }
    },
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (manageSurveyDialogOpen && survey.data?.surveyorId) {
      setSelectedSurveyorId(survey.data.surveyorId);
    }
  }, [manageSurveyDialogOpen, survey.data?.surveyorId]);

  // ✅ FIXED: Get role using proper method
  const user = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();

  const { data: appRole, isLoading: roleLoading } = useQuery({
    queryKey: ["active-member-role", activeOrg.data?.id],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMemberRole();
      const rawRole = (res as any)?.data?.role;
      return normalizeRole(rawRole);
    },
    enabled: !!activeOrg.data,
  });

  // ✅ Compute permissions
  const canView = canUI(appRole, "surveys.view") || canUI(appRole, "poc.view");
  const canManage = canUI(appRole, "surveys.manage");
  const canLockUnlock = canUI(appRole, "surveys.lockUnlock");
  const canGeneratePoc = canUI(appRole, "surveys.generatePoc");
  const canEditPoc = canUI(appRole, "poc.edit") || canUI(appRole, "compliance.manage");

  const currentOrgId = activeOrg.data?.id;

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
    }
  );

  // Fetch available residents (from same facility)
  const availableResidents = api.resident.list.useQuery({
    facilityId: survey.data?.facilityId,
    page: 1,
    pageSize: 100,
  });

  // [KEEP ALL YOUR EXISTING USEEFFECTS - I won't repeat them here for brevity]
  // Fetch all responses across residents AND cases
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data) return;
      try {
        const arr: Array<{
          residentId: number | null;
          surveyCaseId: number | null;
          questionId: number;
          status: StatusVal | null;
          findings: string | null;
        }> = [];

        if (residents.data) {
          await Promise.all(
            residents.data.map(async (r) => {
              const rows = await utils.survey.listResponses.fetch({
                surveyId,
                residentId: r.residentId,
              });
              for (const rr of rows ?? []) {
                arr.push({
                  residentId: r.residentId,
                  surveyCaseId: null,
                  questionId: rr.questionId,
                  status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
                  findings: rr.findings ?? null,
                });
              }
            })
          );
        }

        if (cases.data) {
          await Promise.all(
            cases.data.map(async (c) => {
              const rows = await utils.survey.listResponses.fetch({
                surveyId,
                surveyCaseId: c.id,
              });
              for (const rr of rows ?? []) {
                arr.push({
                  residentId: null,
                  surveyCaseId: c.id,
                  questionId: rr.questionId,
                  status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
                  findings: rr.findings ?? null,
                });
              }
            })
          );
        }

        if (survey.data.template?.type === "general") {
          const generalRows = await utils.survey.listResponses.fetch({ surveyId });
          const generalResponses = generalRows?.filter((r) => !r.residentId && !r.surveyCaseId) ?? [];

          for (const rr of generalResponses) {
            arr.push({
              residentId: null,
              surveyCaseId: null,
              questionId: rr.questionId,
              status: (rr.requirementsMetOrUnmet as StatusVal) ?? null,
              findings: rr.findings ?? null,
            });
          }
        }

        if (!cancelled) {
          setAllResponses(arr);
        }
      } catch (e) {
        console.error("Failed loading responses", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, cases.data, surveyId, utils.survey.listResponses]);

  // Fetch existing POCs for all survey types
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data) {
        if (!cancelled) {
          setHasAnyPOC(false);
          setPocMap(new Map());
          setCombinedPOC("");
        }
        return;
      }

      const templateType = survey.data.template?.type;

      try {
        const newPocMap = new Map<string, string>();
        let foundAnyPOC = false;
        let firstPocText = "";

        if (templateType === "resident" && residents.data && residents.data.length > 0) {
          const residentIds = residents.data.map((r) => r.residentId);
          const pocResults = await Promise.all(
            residentIds.map((rid) => utils.poc.list.fetch({ surveyId, residentId: rid }))
          );

          for (let i = 0; i < residentIds.length; i++) {
            const residentId = residentIds[i];
            const pocRows = pocResults[i] ?? [];

            for (const pocRow of pocRows) {
              if (pocRow.pocText && pocRow.pocText.trim()) {
                const key = `resident-${residentId}-${pocRow.questionId}`;
                newPocMap.set(key, pocRow.pocText.trim());
                foundAnyPOC = true;
                if (!firstPocText) {
                  firstPocText = pocRow.pocText.trim();
                }
              }
            }
          }
        } else if (templateType === "case" && cases.data && cases.data.length > 0) {
          const caseIds = cases.data.map((c) => c.id);
          const pocResults = await Promise.all(
            caseIds.map((cid) => utils.poc.list.fetch({ surveyId, surveyCaseId: cid }))
          );

          for (let i = 0; i < caseIds.length; i++) {
            const caseId = caseIds[i];
            const pocRows = pocResults[i] ?? [];

            for (const pocRow of pocRows) {
              if (pocRow.pocText && pocRow.pocText.trim()) {
                const key = `case-${caseId}-${pocRow.questionId}`;
                newPocMap.set(key, pocRow.pocText.trim());
                foundAnyPOC = true;
                if (!firstPocText) {
                  firstPocText = pocRow.pocText.trim();
                }
              }
            }
          }
        } else if (templateType === "general") {
          const pocRows = await utils.poc.list.fetch({ surveyId });

          for (const pocRow of pocRows) {
            if (pocRow.pocText && pocRow.pocText.trim()) {
              const key = `general-${pocRow.questionId}`;
              newPocMap.set(key, pocRow.pocText.trim());
              foundAnyPOC = true;
              if (!firstPocText) {
                firstPocText = pocRow.pocText.trim();
              }
            }
          }
        }

        if (!cancelled) {
          setPocMap(newPocMap);
          setHasAnyPOC(foundAnyPOC);
          setCombinedPOC(firstPocText);
        }
      } catch (error) {
        console.error("Failed to fetch POCs:", error);
        if (!cancelled) {
          setHasAnyPOC(false);
          setPocMap(new Map());
          setCombinedPOC("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, cases.data, surveyId, utils.poc.list]);

  // Fetch existing DOCs for all survey types
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!survey.data) {
        if (!cancelled) {
          setHasAnyDOC(false);
          setDocMap(new Map());
          setCombinedDOC(null);
        }
        return;
      }

      const templateType = survey.data.template?.type;

      try {
        const newDocMap = new Map<string, Date>();
        let foundAnyDOC = false;
        let firstDocDate: Date | null = null;

        if (templateType === "resident" && residents.data && residents.data.length > 0) {
          const residentIds = residents.data.map((r) => r.residentId);
          const docResults = await Promise.all(
            residentIds.map((rid) => utils.doc.list.fetch({ surveyId, residentId: rid }))
          );

          for (let i = 0; i < residentIds.length; i++) {
            const residentId = residentIds[i];
            const docRows = docResults[i] ?? [];

            for (const docRow of docRows) {
              if (docRow.complianceDate) {
                const key = `resident-${residentId}-${docRow.questionId}`;
                const docDate = new Date(docRow.complianceDate);
                newDocMap.set(key, docDate);
                foundAnyDOC = true;
                if (!firstDocDate) {
                  firstDocDate = docDate;
                }
              }
            }
          }
        } else if (templateType === "case" && cases.data && cases.data.length > 0) {
          const caseIds = cases.data.map((c) => c.id);
          const docResults = await Promise.all(
            caseIds.map((cid) => utils.doc.list.fetch({ surveyId, surveyCaseId: cid }))
          );

          for (let i = 0; i < caseIds.length; i++) {
            const caseId = caseIds[i];
            const docRows = docResults[i] ?? [];

            for (const docRow of docRows) {
              if (docRow.complianceDate) {
                const key = `case-${caseId}-${docRow.questionId}`;
                const docDate = new Date(docRow.complianceDate);
                newDocMap.set(key, docDate);
                foundAnyDOC = true;
                if (!firstDocDate) {
                  firstDocDate = docDate;
                }
              }
            }
          }
        } else if (templateType === "general") {
          const docRows = await utils.doc.list.fetch({ surveyId });

          for (const docRow of docRows) {
            if (docRow.complianceDate) {
              const key = `general-${docRow.questionId}`;
              const docDate = new Date(docRow.complianceDate);
              newDocMap.set(key, docDate);
              foundAnyDOC = true;
              if (!firstDocDate) {
                firstDocDate = docDate;
              }
            }
          }
        }

        if (!cancelled) {
          setDocMap(newDocMap);
          setHasAnyDOC(foundAnyDOC);
          setCombinedDOC(firstDocDate);
        }
      } catch (error) {
        console.error("Failed to fetch DOCs:", error);
        if (!cancelled) {
          setHasAnyDOC(false);
          setDocMap(new Map());
          setCombinedDOC(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [survey.data, residents.data, cases.data, surveyId, utils.doc.list]);

  useEffect(() => {
    if (sheetOpen && pocMap.size > 0) {
      const firstPocText = Array.from(pocMap.values())[0] || "";
      setCombinedPOC(firstPocText);
    }
  }, [sheetOpen, pocMap]);

  // Get all question IDs
  const allQuestionIds = useMemo(() => {
    return (questions.data ?? []).map((q) => q.id);
  }, [questions.data]);

  // Map responses by resident AND case
  const byEntity = useMemo(() => {
    const m = new Map<string, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      const entityKey = r.residentId ? `resident-${r.residentId}` : `case-${r.surveyCaseId}`;
      const inner = m.get(entityKey) ?? new Map<number, ResponseCell>();
      inner.set(r.questionId, { status: r.status, findings: r.findings });
      m.set(entityKey, inner);
    }
    return m;
  }, [allResponses]);

  const byResident = useMemo(() => {
    const m = new Map<number, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      if (r.residentId) {
        const inner = m.get(r.residentId) ?? new Map<number, ResponseCell>();
        inner.set(r.questionId, { status: r.status, findings: r.findings });
        m.set(r.residentId, inner);
      }
    }
    return m;
  }, [allResponses]);

  const byCase = useMemo(() => {
    const m = new Map<number, Map<number, ResponseCell>>();
    for (const r of allResponses) {
      if (r.surveyCaseId) {
        const inner = m.get(r.surveyCaseId) ?? new Map<number, ResponseCell>();
        inner.set(r.questionId, { status: r.status, findings: r.findings });
        m.set(r.surveyCaseId, inner);
      }
    }
    return m;
  }, [allResponses]);

  const questionStrengths: QuestionStrength[] = useMemo(() => {
    const qrows = (questions.data ?? []) as QuestionRow[];
    if (qrows.length === 0) return [];

    const out: QuestionStrength[] = [];

    for (const q of qrows) {
      const questionPoints = q.points ?? 0;

      let metCount = 0,
        unmetCount = 0,
        naCount = 0;

      if (survey.data?.template?.type === "resident") {
        for (const r of residents.data ?? []) {
          const entityKey = `resident-${r.residentId}`;
          const cell = byEntity.get(entityKey)?.get(q.id);
          if (cell?.status === "met") metCount++;
          else if (cell?.status === "unmet") unmetCount++;
          else if (cell?.status === "not_applicable") naCount++;
        }
      } else if (survey.data?.template?.type === "case") {
        for (const c of cases.data ?? []) {
          const entityKey = `case-${c.id}`;
          const cell = byEntity.get(entityKey)?.get(q.id);
          if (cell?.status === "met") metCount++;
          else if (cell?.status === "unmet") unmetCount++;
          else if (cell?.status === "not_applicable") naCount++;
        }
      }

      const total = metCount + unmetCount;
      const strengthPct = total > 0 ? Math.round((metCount / total) * 100) : 0;

      out.push({
        questionId: q.id,
        text: q.text,
        points: questionPoints,
        strengthPct,
        metCount,
        unmetCount,
        naCount,
        ftags: ftagsMap.get(q.id) ?? [],
      });
    }

    return out;
  }, [questions.data, byEntity, residents.data, cases.data, survey.data?.template?.type, ftagsMap]);

  const generalStrengths = React.useMemo(() => {
    if (survey.data?.template?.type !== "general" || !questions.data || !allResponses) return [];

    const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);

    return (questions.data ?? []).map((q) => {
      const resp = generalResponses.find((r) => r.questionId === q.id);
      const questionPoints = q.points ?? 0;
      let metCount = 0,
        unmetCount = 0,
        naCount = 0;

      if (resp) {
        if (resp.status === "met") metCount = 1;
        else if (resp.status === "unmet") unmetCount = 1;
        else if (resp.status === "not_applicable") naCount = 1;
      }

      const total = metCount + unmetCount;
      const strengthPct = total > 0 ? Math.round((metCount / total) * 100) : 0;

      return {
        questionId: q.id,
        text: q.text,
        points: questionPoints,
        strengthPct,
        metCount,
        unmetCount,
        naCount,
        ftags: ftagsMap.get(q.id) ?? [],
      };
    });
  }, [survey.data?.template?.type, questions.data, allResponses, ftagsMap]);

  const ResidentInitial = ({ residentId }: { residentId: number }) => {
    const resident = api.resident.byId.useQuery({ id: residentId });

    if (resident.isPending) {
      return <Skeleton className="h-4 w-16" />;
    }

    return <span>{resident.data?.name || `ID: ${residentId}`}</span>;
  };

  const residentProgress = useMemo(() => {
    const map = new Map<number, { answered: number; unanswered: number }>();
    if (!residents.data || allQuestionIds.length === 0) return map;

    for (const r of residents.data) {
      const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
      let answered = 0;

      for (const qid of allQuestionIds) {
        const item = ansMap.get(qid);
        if (
          item?.status &&
          (item.status === "met" || item.status === "unmet" || item.status === "not_applicable")
        ) {
          answered += 1;
        }
      }

      const unanswered = allQuestionIds.length - answered;
      map.set(r.residentId, { answered, unanswered });
    }
    return map;
  }, [residents.data, allQuestionIds, byResident]);

  const caseProgress = useMemo(() => {
    const map = new Map<number, { answered: number; unanswered: number }>();
    if (!cases.data || allQuestionIds.length === 0) return map;

    for (const c of cases.data) {
      const ansMap = byCase.get(c.id) ?? new Map<number, ResponseCell>();
      let answered = 0;

      for (const qid of allQuestionIds) {
        const item = ansMap.get(qid);
        if (
          item?.status &&
          (item.status === "met" || item.status === "unmet" || item.status === "not_applicable")
        ) {
          answered += 1;
        }
      }

      const unanswered = allQuestionIds.length - answered;
      map.set(c.id, { answered, unanswered });
    }
    return map;
  }, [cases.data, allQuestionIds, byCase]);

  const { overallScore, maxTemplatePoints, overallPercent } = useMemo(() => {
    const qs: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    let awarded = 0;

    for (const q of qs) {
      let hasUnmet = false;
      let hasMet = false;
      let responseCount = 0;
      let naCount = 0;

      if (survey.data?.template?.type === "resident") {
        for (const r of residents.data ?? []) {
          const entityKey = `resident-${r.residentId}`;
          const cell = byEntity.get(entityKey)?.get(q.id);

          if (!cell?.status) {
            hasUnmet = true;
            break;
          }

          responseCount++;

          if (cell.status === "unmet") {
            hasUnmet = true;
            break;
          } else if (cell.status === "met") {
            hasMet = true;
          } else if (cell.status === "not_applicable") {
            naCount++;
          }
        }
      } else if (survey.data?.template?.type === "case") {
        for (const c of cases.data ?? []) {
          const entityKey = `case-${c.id}`;
          const cell = byEntity.get(entityKey)?.get(q.id);

          if (!cell?.status) {
            hasUnmet = true;
            break;
          }

          responseCount++;

          if (cell.status === "unmet") {
            hasUnmet = true;
            break;
          } else if (cell.status === "met") {
            hasMet = true;
          } else if (cell.status === "not_applicable") {
            naCount++;
          }
        }
      } else if (survey.data?.template?.type === "general") {
        const generalResponses = allResponses.filter(
          (r: any) => !r.residentId && !r.surveyCaseId
        );
        const cell = generalResponses.find((r: any) => r.questionId === q.id);

        if (!cell || !cell.status) {
          hasUnmet = true;
        } else {
          responseCount++;

          if (cell.status === "unmet") {
            hasUnmet = true;
          } else if (cell.status === "met") {
            hasMet = true;
          } else if (cell.status === "not_applicable") {
            naCount++;
          }
        }
      }

      const allNA = responseCount > 0 && naCount === responseCount;
      const shouldAward = !hasUnmet && (hasMet || allNA);

      if (shouldAward) {
        awarded += q.points ?? 0;
      }
    }

    const max = qs.reduce((s, q) => s + (q.points ?? 0), 0);
    const pct = max > 0 ? Math.round((awarded / max) * 100) : 0;

    return { overallScore: awarded, maxTemplatePoints: max, overallPercent: pct };
  }, [questions.data, byEntity, residents.data, cases.data, allResponses, survey.data?.template?.type]);

  const isSurveyComplete = useMemo(() => {
    if (!questions.data || questions.data.length === 0) return false;

    const templateType = survey.data?.template?.type;

    if (templateType === "resident") {
      if (!residents.data || residents.data.length === 0) return false;

      return questions.data.every((q) => {
        return residents.data!.every((r) => {
          const cell = byEntity.get(`resident-${r.residentId}`)?.get(q.id);
          return cell?.status;
        });
      });
    } else if (templateType === "case") {
      if (!cases.data || cases.data.length === 0) return false;

      return questions.data.every((q) => {
        return cases.data!.every((c) => {
          const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
          return cell?.status;
        });
      });
    } else if (templateType === "general") {
      const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);

      const result = questions.data.every((q) => {
        const response = generalResponses.find((r) => r.questionId === q.id);
        const isValid =
          response &&
          (response.status === "met" ||
            response.status === "unmet" ||
            response.status === "not_applicable");

        return isValid;
      });

      return result;
    }

    return false;
  }, [questions.data, residents.data, cases.data, allResponses, byEntity, survey.data?.template?.type]);

  const isLocked = Boolean(survey.data?.isLocked);
  const pocGenerated = Boolean(survey.data?.pocGenerated);
  const scoreAllowsPOC = overallPercent < 85;
  const canOpenPOCSheet = isLocked && pocGenerated && scoreAllowsPOC;

  const sheetBlocks = useMemo(() => {
    const qrows: QuestionRow[] = (questions.data ?? []) as QuestionRow[];
    if (qrows.length === 0 || !canOpenPOCSheet) {
      return [] as Array<{
        qid: number;
        text: string;
        ftags: string[];
        strengthPct: number;
        items: Array<{ residentPcciId?: string; caseNumber?: string; findings: string | null }>;
      }>;
    }

    const templateType = survey.data?.template?.type;
    const blocks: Array<{
      qid: number;
      text: string;
      ftags: string[];
      strengthPct: number;
      items: Array<{ residentPcciId?: string; caseNumber?: string; findings: string | null }>;
    }> = [];

    for (const q of qrows) {
      const items: Array<{ residentPcciId?: string; caseNumber?: string; findings: string | null }> = [];

      if (templateType === "resident") {
        for (const r of residents.data ?? []) {
          const cell = byResident.get(r.residentId)?.get(q.id);
          if (cell?.status === "unmet") {
            items.push({ residentPcciId: r.pcciId, findings: cell.findings ?? null });
          }
        }
      } else if (templateType === "case") {
        for (const c of cases.data ?? []) {
          const cell = byEntity.get(`case-${c.id}`)?.get(q.id);
          if (cell?.status === "unmet") {
            items.push({ caseNumber: c.caseCode, findings: cell.findings ?? null });
          }
        }
      } else if (templateType === "general") {
        const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);
        const cell = generalResponses.find((r) => r.questionId === q.id);
        if (cell?.status === "unmet") {
          items.push({ findings: cell.findings ?? null });
        }
      }

      if (items.length > 0) {
        const ftags = (ftagsMap.get(q.id) ?? []).map((f) => f.code);
        const s = questionStrengths.find((x) => x.questionId === q.id)?.strengthPct ?? 0;
        blocks.push({ qid: q.id, text: q.text, ftags, strengthPct: s, items });
      }
    }

    return blocks;
  }, [
    questions.data,
    canOpenPOCSheet,
    byResident,
    residents.data,
    cases.data,
    byEntity,
    allResponses,
    questionStrengths,
    survey.data?.template?.type,
    ftagsMap,
  ]);

  const allAnswered = surveyCompletion.data?.isComplete ?? false;

  useEffect(() => {
    if (surveyCompletion.data) {
      console.log("Survey completion status:", surveyCompletion.data);
    }
  }, [surveyCompletion.data]);

  // [KEEP ALL YOUR EXISTING HANDLERS - handleDownloadPDF, handleSaveCombinedPOC, etc.]
  const handleDownloadPDF = useCallback(async () => {
    if (!survey.data || !hasAnyPOC) return;

    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction Report", 20, 25);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      let yPos = 45;

      doc.text(`Survey Number: #${surveyId}`, 20, yPos);
      yPos += 8;

      const facilityName = facility.data?.name || `Facility ID: ${survey.data.facilityId}`;
      doc.text(`Facility: ${facilityName}`, 20, yPos);
      yPos += 8;

      const surveyorName =
        surveyor.data?.name || surveyor.data?.email || `User ID: ${survey.data.surveyorId}`;
      doc.text(`Surveyor: ${surveyorName}`, 20, yPos);
      yPos += 8;

      const templateName = survey.data.template?.name || `Template #${survey.data.templateId}`;
      doc.text(`Template: ${templateName}`, 20, yPos);
      yPos += 8;

      doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}`, 20, yPos);
      yPos += 15;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Plan of Correction", 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const pocLines = doc.splitTextToSize(combinedPOC, 170);

      if (yPos + pocLines.length * 5 > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(pocLines, 20, yPos);
      yPos += pocLines.length * 5 + 15;

      if (hasAnyDOC && combinedDOC) {
        if (yPos + 20 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Date of Compliance", 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Compliance Date: ${format(combinedDOC, "MMM dd, yyyy")}`, 20, yPos);
        yPos += 15;
      }

      if (comments.data && comments.data.length > 0) {
        if (yPos + 30 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Comments", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const comment of comments.data) {
          if (yPos + 25 > 280) {
            doc.addPage();
            yPos = 20;
          }

          const authorName = comment.author?.name || "Unknown User";
          const commentDate = comment.createdAt
            ? format(new Date(comment.createdAt), "MMM dd, yyyy 'at' h:mm a")
            : "";

          doc.setFont("helvetica", "bold");
          doc.text(`${authorName} - ${commentDate}`, 20, yPos);
          yPos += 6;

          doc.setFont("helvetica", "normal");
          const commentLines = doc.splitTextToSize(comment.commentText, 170);
          doc.text(commentLines, 20, yPos);
          yPos += commentLines.length * 4 + 8;
        }
      }

      if (sheetBlocks.length > 0) {
        if (yPos + 30 > 280) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Questions Requiring Attention", 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        for (const block of sheetBlocks) {
          if (yPos + 30 > 280) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFont("helvetica", "bold");
          const questionLines = doc.splitTextToSize(block.text, 170);
          doc.text(questionLines, 20, yPos);
          yPos += questionLines.length * 4 + 3;

          doc.setFont("helvetica", "normal");
          doc.text(`Strength: ${block.strengthPct}%`, 20, yPos);
          if (block.ftags.length > 0) {
            doc.text(`F-Tags: ${block.ftags.join(", ")}`, 90, yPos);
          }
          yPos += 6;

          const templateType = survey.data?.template?.type;
          if (templateType === "resident") {
            doc.setFont("helvetica", "italic");
            doc.text("Residents with unmet:", 20, yPos);
            yPos += 4;

            doc.setFont("helvetica", "normal");
            for (const item of block.items) {
              if (item.residentPcciId) {
                doc.text(`• PCCI: ${item.residentPcciId}`, 25, yPos);
                if (item.findings) {
                  yPos += 4;
                  const findingsLines = doc.splitTextToSize(`  Findings: ${item.findings}`, 160);
                  doc.text(findingsLines, 25, yPos);
                  yPos += findingsLines.length * 4;
                }
                yPos += 3;
              }
            }
          } else if (templateType === "case") {
            doc.setFont("helvetica", "italic");
            doc.text("Cases with unmet:", 20, yPos);
            yPos += 4;

            doc.setFont("helvetica", "normal");
            for (const item of block.items) {
              if (item.caseNumber) {
                doc.text(`• Case: ${item.caseNumber}`, 25, yPos);
                if (item.findings) {
                  yPos += 4;
                  const findingsLines = doc.splitTextToSize(`  Findings: ${item.findings}`, 160);
                  doc.text(findingsLines, 25, yPos);
                  yPos += findingsLines.length * 4;
                }
                yPos += 3;
              }
            }
          } else if (templateType === "general") {
            doc.setFont("helvetica", "italic");
            doc.text("Unmet requirements:", 20, yPos);
            yPos += 4;

            doc.setFont("helvetica", "normal");
            for (const item of block.items) {
              if (item.findings) {
                const findingsLines = doc.splitTextToSize(`• ${item.findings}`, 160);
                doc.text(findingsLines, 25, yPos);
                yPos += findingsLines.length * 4 + 3;
              } else {
                doc.text("• Requirements not met", 25, yPos);
                yPos += 6;
              }
            }
          }
          yPos += 5;
        }
      }

      doc.save(`POC_Report_Survey_${surveyId}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [
    survey.data,
    hasAnyPOC,
    surveyId,
    combinedPOC,
    comments.data,
    sheetBlocks,
    hasAnyDOC,
    combinedDOC,
    facility.data,
    surveyor.data,
  ]);

  const handleSaveCombinedPOC = useCallback(async () => {
    if (!survey.data || !canOpenPOCSheet) return;
    const templateId = survey.data.templateId;
    const templateType = survey.data.template?.type;
    const text = combinedPOC.trim();
    if (!text) {
      toast.error("POC text cannot be empty");
      return;
    }

    try {
      const updates: Array<{
        residentId?: number;
        surveyCaseId?: number;
        questionId: number;
      }> = [];

      if (templateType === "resident") {
        for (const r of residents.data ?? []) {
          const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
          for (const q of questions.data ?? []) {
            const cell = ansMap.get(q.id);
            if (cell?.status === "unmet") {
              updates.push({ residentId: r.residentId, questionId: q.id });
            }
          }
        }
      } else if (templateType === "case") {
        for (const c of cases.data ?? []) {
          const ansMap = byEntity.get(`case-${c.id}`) ?? new Map<number, ResponseCell>();
          for (const q of questions.data ?? []) {
            const cell = ansMap.get(q.id);
            if (cell?.status === "unmet") {
              updates.push({ surveyCaseId: c.id, questionId: q.id });
            }
          }
        }
      } else if (templateType === "general") {
        const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);
        for (const q of questions.data ?? []) {
          const cell = generalResponses.find((r) => r.questionId === q.id);
          if (cell?.status === "unmet") {
            updates.push({ questionId: q.id });
          }
        }
      }

      if (updates.length === 0) {
        toast.error("No questions with unmet answers found");
        return;
      }

      await Promise.all(
        updates.map((update) => {
          const pocData: any = {
            surveyId,
            templateId,
            questionId: update.questionId,
            pocText: text,
          };

          if (update.residentId) {
            pocData.residentId = update.residentId;
          } else if (update.surveyCaseId) {
            pocData.surveyCaseId = update.surveyCaseId;
          }

          return pocUpsert.mutateAsync(pocData);
        })
      );

      const newPocMap = new Map(pocMap);
      updates.forEach((update) => {
        const key = update.residentId
          ? `resident-${update.residentId}-${update.questionId}`
          : update.surveyCaseId
            ? `case-${update.surveyCaseId}-${update.questionId}`
            : `general-${update.questionId}`;
        newPocMap.set(key, text);
      });
      setPocMap(newPocMap);
      setHasAnyPOC(true);

      if (templateType === "resident") {
        const affectedResidents = Array.from(
          new Set(updates.map((u) => u.residentId).filter(Boolean))
        );
        await Promise.all(
          affectedResidents.map((rid) => utils.poc.list.invalidate({ surveyId, residentId: rid }))
        );
      } else if (templateType === "case") {
        const affectedCases = Array.from(
          new Set(updates.map((u) => u.surveyCaseId).filter(Boolean))
        );
        await Promise.all(
          affectedCases.map((cid) => utils.poc.list.invalidate({ surveyId, surveyCaseId: cid }))
        );
      } else if (templateType === "general") {
        await utils.poc.list.invalidate({ surveyId });
      }

      setSheetOpen(false);
      toast.success("POC updated for unmet questions successfully");
    } catch (e) {
      console.error("Save combined POC failed", e);
      toast.error("Failed to save POC");
    }
  }, [
    survey.data,
    canOpenPOCSheet,
    combinedPOC,
    pocUpsert,
    utils.poc.list,
    surveyId,
    questions.data,
    residents.data,
    cases.data,
    byResident,
    byEntity,
    allResponses,
    pocMap,
  ]);

  const handleSaveCombinedDOC = useCallback(async () => {
    if (!survey.data || !canOpenPOCSheet || !combinedDOC) return;
    const templateId = survey.data.templateId;
    const templateType = survey.data.template?.type;

    try {
      const updates: Array<{
        residentId?: number;
        surveyCaseId?: number;
        questionId: number;
      }> = [];

      if (templateType === "resident") {
        for (const r of residents.data ?? []) {
          const ansMap = byResident.get(r.residentId) ?? new Map<number, ResponseCell>();
          for (const q of questions.data ?? []) {
            const cell = ansMap.get(q.id);
            if (cell?.status === "unmet") {
              updates.push({ residentId: r.residentId, questionId: q.id });
            }
          }
        }
      } else if (templateType === "case") {
        for (const c of cases.data ?? []) {
          const ansMap = byEntity.get(`case-${c.id}`) ?? new Map<number, ResponseCell>();
          for (const q of questions.data ?? []) {
            const cell = ansMap.get(q.id);
            if (cell?.status === "unmet") {
              updates.push({ surveyCaseId: c.id, questionId: q.id });
            }
          }
        }
      } else if (templateType === "general") {
        const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);
        for (const q of questions.data ?? []) {
          const cell = generalResponses.find((r) => r.questionId === q.id);
          if (cell?.status === "unmet") {
            updates.push({ questionId: q.id });
          }
        }
      }

      if (updates.length === 0) {
        toast.error("No questions with unmet answers found");
        return;
      }

      if (!combinedDOC) return;
      const complianceDateString = combinedDOC.toISOString().split("T")[0];
      if (!complianceDateString) return;

      await Promise.all(
        updates.map((update) => {
          const docData: any = {
            surveyId,
            templateId,
            questionId: update.questionId,
            complianceDate: complianceDateString,
          };

          if (update.residentId) {
            docData.residentId = update.residentId;
          } else if (update.surveyCaseId) {
            docData.surveyCaseId = update.surveyCaseId;
          }

          return docUpsert.mutateAsync(docData);
        })
      );

      const newDocMap = new Map(docMap);
      updates.forEach((update) => {
        const key = update.residentId
          ? `resident-${update.residentId}-${update.questionId}`
          : update.surveyCaseId
            ? `case-${update.surveyCaseId}-${update.questionId}`
            : `general-${update.questionId}`;
        newDocMap.set(key, combinedDOC);
      });
      setDocMap(newDocMap);
      setHasAnyDOC(true);

      if (templateType === "resident") {
        const affectedResidents = Array.from(
          new Set(updates.map((u) => u.residentId).filter(Boolean))
        );
        await Promise.all(
          affectedResidents.map((rid) => utils.doc.list.invalidate({ surveyId, residentId: rid }))
        );
      } else if (templateType === "case") {
        const affectedCases = Array.from(
          new Set(updates.map((u) => u.surveyCaseId).filter(Boolean))
        );
        await Promise.all(
          affectedCases.map((cid) => utils.doc.list.invalidate({ surveyId, surveyCaseId: cid }))
        );
      } else if (templateType === "general") {
        await utils.doc.list.invalidate({ surveyId });
      }

      toast.success("Date of Compliance updated for unmet questions successfully");
    } catch (e) {
      console.error("Save combined DOC failed", e);
      toast.error("Failed to save Date of Compliance");
    }
  }, [
    survey.data,
    canOpenPOCSheet,
    combinedDOC,
    docUpsert,
    utils.doc.list,
    surveyId,
    questions.data,
    residents.data,
    cases.data,
    byResident,
    byEntity,
    allResponses,
    docMap,
  ]);

  const handleAddComment = useCallback(async () => {
    if (!survey.data || !newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        surveyId,
        templateId: survey.data.templateId,
        commentText: newComment.trim(),
      });
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  }, [survey.data, newComment, addComment, surveyId]);

  if (roleLoading) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: `Survey #${surveyId}` }]} />
        <main className="space-y-4 p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading permissions...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: `Survey #${surveyId}` }]} />
        <main className="space-y-4 p-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-lg font-semibold text-destructive mb-2">Access Denied</p>
              <p className="text-muted-foreground">
                You don't have permission to view this survey.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!survey.data || !residents.data || !cases.data) {
    return (
      <>
        <QISVHeader crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: `Survey #${surveyId}` }]} />
        <main className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </>
    );
  }

  const lockDisabled = !canLockUnlock || !isSurveyComplete || lockSurvey.isPending;
  const unlockDisabled = !canLockUnlock || unlockSurvey.isPending;
  const lockDisabledReason =
    !canLockUnlock
      ? "You do not have permission to lock/unlock surveys."
      : !isSurveyComplete
        ? "Complete all questions for all residents to enable lock."
        : lockSurvey.isPending
          ? "Locking..."
          : "";

  const LockUnlockButtons = () => {
    if (!isLocked) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="relative group">
              <Button
                variant="default"
                disabled={lockDisabled}
                className={cn(lockDisabled && "cursor-not-allowed opacity-60")}
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock Survey
              </Button>
              {lockDisabled && lockDisabledReason && (
                <div className="pointer-events-none absolute -bottom-8 right-0 hidden rounded bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow group-hover:block">
                  {lockDisabledReason}
                </div>
              )}
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lock survey?</AlertDialogTitle>
              <AlertDialogDescription>
                Once locked, edits to this survey will be disabled until it is unlocked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!isSurveyComplete) {
                    toast.error("Please complete all questions before locking the survey");
                    return;
                  }
                  lockSurvey.mutate({ surveyId: surveyId });
                }}
                disabled={lockDisabled}
                className={cn(
                  "px-6 py-2.5 font-medium rounded-md transition-all duration-200 flex items-center gap-2",
                  isSurveyComplete
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    : "bg-red-200 text-red-400 cursor-not-allowed"
                )}
              >
                {lockSurvey.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Locking...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Lock Survey</span>
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={unlockDisabled}>
            <Unlock className="mr-2 h-4 w-4" />
            Unlock Survey
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock survey?</AlertDialogTitle>
            <AlertDialogDescription>Unlocking will allow edits again. Continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void unlockSurvey.mutate({ surveyId });
              }}
              disabled={unlockSurvey.isPending}
            >
              {unlockSurvey.isPending ? "Unlocking..." : "Confirm Unlock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const ManageSurveyDialog = () => {
    const [localCaseCode, setLocalCaseCode] = React.useState("");
    const templateType = survey.data?.template?.type;

    return (
      <Dialog open={manageSurveyDialogOpen} onOpenChange={setManageSurveyDialogOpen} modal={false}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLocked}>
            <Pencil className="mr-2 h-4 w-4" />
            Manage Survey
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-3xl max-h-[85vh] flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Manage Survey</DialogTitle>
            <DialogDescription>Edit survey details, surveyor, and participants</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns:
                  templateType === "resident" ? "1fr 1fr" : templateType === "case" ? "1fr 1fr" : "1fr",
              }}
            >
              <TabsTrigger value="surveyor">Surveyor</TabsTrigger>
              {templateType === "resident" && <TabsTrigger value="residents">Residents</TabsTrigger>}
              {templateType === "case" && <TabsTrigger value="cases">Cases</TabsTrigger>}
            </TabsList>

            <TabsContent value="surveyor" className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label>Change Surveyor</Label>
                <Select value={selectedSurveyorId} onValueChange={setSelectedSurveyorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select surveyor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.data?.map((userMember) => (
                      <SelectItem key={userMember.id} value={userMember.id}>
                        {userMember.name || userMember.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (selectedSurveyorId) {
                    updateSurveyor.mutate({
                      surveyId,
                      surveyorId: selectedSurveyorId,
                    });
                  }
                }}
                disabled={!selectedSurveyorId || updateSurveyor.isPending}
                className="w-full"
              >
                {updateSurveyor.isPending ? "Updating..." : "Update Surveyor"}
              </Button>
            </TabsContent>

            {templateType === "resident" && (
              <TabsContent value="residents" className="flex-1 flex flex-col overflow-hidden">
                <div className="space-y-4 border-b pb-4 px-4">
                  <Label>Add Resident</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedResidentId?.toString() ?? ""}
                      onValueChange={(val) => setSelectedResidentId(Number(val))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select resident to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableResidents.data?.data
                          ?.filter((r) => !residents.data?.some((sr) => sr.residentId === r.id))
                          .map((resident) => (
                            <SelectItem key={resident.id} value={resident.id.toString()}>
                              {resident.name} - PCCI: {resident.pcciId}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        if (selectedResidentId) {
                          addResident.mutate({
                            surveyId,
                            residentId: selectedResidentId,
                          });
                        }
                      }}
                      disabled={!selectedResidentId || addResident.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pt-4">
                  <Label className="mb-2 block">Current Residents ({residents.data?.length})</Label>
                  <div className="space-y-2">
                    {residents.data?.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-sm text-muted-foreground">
                            PCCI: {r.pcciId} • Room: {r.roomId}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            removeResident.mutate({
                              surveyId,
                              residentId: r.residentId,
                            });
                          }}
                          disabled={removeResident.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!residents.data || residents.data.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No residents added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

            {templateType === "case" && (
              <TabsContent value="cases" className="flex-1 flex flex-col overflow-hidden">
                <div className="space-y-4 border-b pb-4 px-4">
                  <Label>Add Case</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter case code..."
                      value={localCaseCode}
                      onChange={(e) => setLocalCaseCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && localCaseCode.trim()) {
                          addCase.mutate({
                            surveyId,
                            caseCode: localCaseCode.trim(),
                          });
                          setLocalCaseCode("");
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (localCaseCode.trim()) {
                          addCase.mutate({
                            surveyId,
                            caseCode: localCaseCode.trim(),
                          });
                          setLocalCaseCode("");
                        }
                      }}
                      disabled={!localCaseCode.trim() || addCase.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pt-4">
                  <Label className="mb-2 block">Current Cases ({cases.data?.length})</Label>
                  <div className="space-y-2">
                    {cases.data?.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium">Case {c.caseCode}</div>
                          <div className="text-sm text-muted-foreground">ID: {c.id}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            removeCase.mutate({
                              surveyId,
                              caseId: c.id,
                            });
                          }}
                          disabled={removeCase.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!cases.data || cases.data.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No cases added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageSurveyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  ManageSurveyDialog.displayName = "ManageSurveyDialog";

  const renderPOCControl = () => {
    if (!isLocked) return null;

    if (!scoreAllowsPOC) {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4" />
          POC available when score is below 85%
        </div>
      );
    }

    if (!pocGenerated) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            POC not generated yet
          </div>

          <Button
            onClick={() => {
              if (!canGeneratePoc) return;
              markPocGenerated.mutate({ surveyId });
            }}
            disabled={markPocGenerated.isPending || !canGeneratePoc}
            variant="default"
            className="bg-red-600 hover:bg-red-700"
            title={!canGeneratePoc ? "You do not have permission to generate POC" : undefined}
          >
            <FileText className="mr-2 h-4 w-4" />
            {canGeneratePoc ? (markPocGenerated.isPending ? "Generating..." : "Generate POC") : "POC not generated"}
          </Button>
        </div>
      );
    }

    const label = hasAnyPOC ? "View POC" : "Fill POC";
    const totalUnmetQuestions = sheetBlocks.length;

    return (
      <Sheet open={sheetOpen} onOpenChange={(open) => canView && setSheetOpen(open)}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            className="bg-red-600 hover:bg-red-700"
            disabled={!canView}
            title={!canView ? "You do not have permission to view POC" : undefined}
          >
            <FileText className="mr-2 h-4 w-4" />
            {label}
            {totalUnmetQuestions > 0 ? (
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800">
                {totalUnmetQuestions}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col">
          {/* [KEEP YOUR EXISTING SHEET CONTENT HERE - I won't repeat it for brevity] */}
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      <QISVHeader
        crumbs={[
          { label: "Surveys", href: "/qisv/surveys" },
          { label: `Survey #${surveyId}` },
        ]}
      />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold">
              Survey ID #{surveyId}{" "}
              {survey.data.template && <Badge>{survey.data.template.type}</Badge>}
              {isLocked && <Badge variant="secondary">Locked</Badge>}
            </h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <FacilityInfo facilityId={survey.data.facilityId} />
              <div className="flex items-center justify-between gap-4">
                <SurveyorInfo surveyorId={survey.data.surveyorId} />
                {!isLocked && canManage ? <ManageSurveyDialog /> : null}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-xs uppercase text-muted-foreground">Score</div>
              <div className="text-xl font-semibold">{`${overallScore} / ${maxTemplatePoints}`}</div>
            </div>

            {canLockUnlock ? <LockUnlockButtons /> : null}

            {renderPOCControl()}
          </div>
        </div>

        <Separator />

        {/* [KEEP ALL YOUR EXISTING UI - Question Strengths, Tables, etc.] */}
        {survey.data?.template?.type === "general" && generalStrengths.length > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                {survey.data.template?.name || `Template #${survey.data.templateId}`}
              </h2>
              <p className="text-sm text-muted-foreground">{allQuestionIds.length} questions</p>
            </div>
            <div className="rounded-md border p-3 mb-8">
              <div className="text-sm font-medium mb-2">Question Strengths</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {generalStrengths.map((qs) => (
                  <div
                    key={qs.questionId}
                    className={cn(
                      "border px-3 py-2 rounded-md text-xs",
                      qs.strengthPct < 85 ? "bg-amber-50 border-amber-200" : "bg-muted"
                    )}
                  >
                    <div className="font-semibold line-clamp-1">{qs.text}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {qs.ftags && qs.ftags.length > 0 ? (
                        <>
                          F-Tags:
                          {qs.ftags.map((ftag) => (
                            <span
                              key={ftag.id}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                              title={ftag.description ?? ftag.code}
                            >
                              {ftag.code}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No F-Tags</span>
                      )}
                    </div>
                    <div className="mt-1 font-bold"> Score: {qs.unmetCount > 0 ? 0 : qs.points}</div>

                    <div className="mt-1">Strength: {qs.strengthPct}%</div>
                    <div className="text-muted-foreground">
                      Met: {qs.metCount} ・ Unmet: {qs.unmetCount} ・ N/A: {qs.naCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(survey.data?.template?.type === "resident" || survey.data?.template?.type === "case") && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                {survey.data.template?.name || `Template #${survey.data.templateId}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {allQuestionIds.length} questions • {residents.data.length} residents
              </p>
            </div>

            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Question Strengths</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {questionStrengths.map((qs) => (
                  <div
                    key={qs.questionId}
                    className={cn(
                      "border px-3 py-2 rounded-md text-xs",
                      qs.strengthPct < 85 ? "bg-amber-50 border-amber-200" : "bg-muted"
                    )}
                  >
                    <div className="font-semibold line-clamp-1">{qs.text}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {qs.ftags && qs.ftags.length > 0 ? (
                        <>
                          F-Tags:
                          {qs.ftags.map((ftag) => (
                            <span
                              key={ftag.id}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                              title={ftag.description ?? ftag.code}
                            >
                              {ftag.code}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">No F-Tags</span>
                      )}
                    </div>
                    <div className="mt-1 font-bold"> Score: {qs.unmetCount > 0 ? 0 : qs.points}</div>
                    <div className="mt-1">Strength: {qs.strengthPct}%</div>
                    <div className="text-muted-foreground">
                      Met: {qs.metCount} • Unmet: {qs.unmetCount} • NA: {qs.naCount || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {survey.data?.template?.type === "resident" && (
          <>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">Residents</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Initials</TableHead>
                  <TableHead className="w-[160px]">Progress</TableHead>
                  <TableHead className="text-right w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.data.map((r) => {
                  const progress = residentProgress.get(r.residentId) ?? {
                    answered: 0,
                    unanswered: allQuestionIds.length,
                  };
                  const totalQ = allQuestionIds.length || 1;
                  const pct = Math.round((progress.answered / totalQ) * 100);

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <ResidentInitial residentId={r.residentId} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {progress.answered} answered • {progress.unanswered} pending
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-muted overflow-hidden">
                          <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/qisv/surveys/${surveyId}/resident/${r.residentId}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {survey.data.template?.type === "general" && (
          <div className="mb-4">
            {(() => {
              const generalResponses = allResponses.filter((r) => !r.residentId && !r.surveyCaseId);
              const hasResponses = generalResponses.length > 0;

              return (
                <Link
                  href={`/qisv/surveys/${surveyId}/general`}
                  className={cn(buttonVariants({ variant: "default" }), "bg-green-600 hover:bg-green-700")}
                >
                  {hasResponses ? "View Survey" : "Start Survey"}
                </Link>
              );
            })()}
          </div>
        )}

        {survey.data.template?.type === "case" && (
          <>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">Cases</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead className="w-[160px]">Progress</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.data.map((c) => {
                  const progress = caseProgress.get(c.id) ?? {
                    answered: 0,
                    unanswered: allQuestionIds.length,
                  };
                  const totalQ = allQuestionIds.length || 1;
                  const pct = Math.round((progress.answered / totalQ) * 100);

                  return (
                    <TableRow key={c.id}>
                      <TableCell>{c.caseCode}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {progress.answered} answered, {progress.unanswered} pending
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-muted overflow-hidden">
                          <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/qisv/surveys/${surveyId}/case/${c.id}`}
                          className={buttonVariants({ variant: "outline" })}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </main>
    </>
  );
}

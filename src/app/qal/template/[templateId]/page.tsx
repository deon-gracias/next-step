"use client";

import { useSearchParams, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function QALTemplateDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = Number((params as any).templateId);
  const initialSectionId = searchParams.get("sectionId");

  const tpl = api.qal.getActiveTemplate.useQuery();
  const [active, setActive] = useState<string | null>(null);

  // Determine the sections for this templateId (active template in router already holds sections)
  const sections = useMemo(() => {
    if (!tpl.data || tpl.data.id !== templateId) return [];
    return tpl.data.sections ?? [];
  }, [tpl.data, templateId]);

  // Default the active tab to the requested sectionId or the first one
  useEffect(() => {
    if (!sections.length) return;
    const fallback = String(sections[0]!.id);
    setActive(initialSectionId ? String(initialSectionId) : fallback);
  }, [sections, initialSectionId]);

  if (!tpl.data || tpl.data.id !== templateId) {
    return (
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Template not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Either the template is not active or the ID does not match the active QAL template.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template #{tpl.data.id}</h1>
          <p className="text-sm text-muted-foreground">{tpl.data.name}</p>
        </div>
        <Badge variant="secondary">Sections: {sections.length}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sections & Items</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sections available.</div>
          ) : (
            <Tabs value={active ?? ""} onValueChange={setActive}>
              <TabsList className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)}>
                    {s.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {sections.map((s) => (
                <TabsContent key={s.id} value={String(s.id)} className="mt-4">
                  <SectionQuestions templateId={tpl.data!!.id} sectionId={s.id} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function SectionQuestions({ templateId, sectionId }: { templateId: number; sectionId: number }) {
  // Reuse the survey-oriented question reader by passing a fake survey context,
  // or create a dedicated endpoint (recommended) to fetch master questions by section.
  // Here we assume you add: api.qal.getSectionMasterQuestions({ sectionId })
  const q = api.qal.getSectionMasterQuestions.useQuery({ sectionId });


  if (!q.data) {
    return <div className="text-sm text-muted-foreground">Loading questions...</div>;
  }
  if (q.data.length === 0) {
    return <div className="text-sm text-muted-foreground">No items configured for this section.</div>;
  }

  return (
    <div className="space-y-3">
      {q.data.map((it, idx) => (
        <div key={it.id} className="rounded border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="font-medium">
              {idx + 1}. {it.prompt}
            </div>
          </div>
          {it.guidance && (
            <div className="text-xs text-muted-foreground mt-1">{it.guidance}</div>
          )}
        </div>
      ))}
    </div>
  );
}

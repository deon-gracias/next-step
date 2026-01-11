import type { SurveySelectType } from "@/server/db/schema";

export function SurveyItem({ survey }: { survey: SurveySelectType }) {
  return (
    <pre className="max-w-full whitespace-pre-wrap">
      {JSON.stringify(survey, null, 2)}
    </pre>
  );
}

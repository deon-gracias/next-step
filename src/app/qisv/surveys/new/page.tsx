import { QISVHeader } from "../../_components/header";
import { NewSurveyForm } from "../_components/new-survey-form";

export default function () {
  return (
    <>
      <QISVHeader
        crumbs={[{ label: "Surveys", href: "/qisv/surveys" }, { label: "New" }]}
      />

      <main className="px-4">
        <NewSurveyForm />
      </main>
    </>
  );
}

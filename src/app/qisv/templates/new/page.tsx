import { Button } from "@/components/ui/button";
import { QISVHeader } from "../../_components/header";
import { PlusIcon } from "lucide-react";

export default function() {
  return (
    <main>
      <QISVHeader
        crumbs={[
          { label: "Assessments", href: "/qisv/assessments" },
          { label: "New" },
        ]}
      />

      <NewAssessmentForm />
    </main>
  );
}

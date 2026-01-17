import { Skeleton } from "@/components/ui/skeleton";
import { QISVHeader } from "../_components/header";

export default function LoadingPage() {
  return (
    <>
      <QISVHeader crumbs={[{ label: "Surveys" }]} />
      <div className="flex h-full flex-col gap-4 px-4 py-2">
        <Skeleton className="h-[50px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-full max-h-[600px]" />
      </div>
    </>
  );
}

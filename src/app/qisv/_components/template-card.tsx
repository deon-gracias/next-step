import { Badge } from "@/components/ui/badge";
import { HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TemplateSelectType } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { HoverCard } from "@radix-ui/react-hover-card";
import { MapPinIcon } from "lucide-react";

export function TemplateHoverCard({
  template,
}: {
  template: TemplateSelectType;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge
          variant="outline"
          className="hover:bg-muted cursor-pointer text-xs"
        >
          {template.name}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex items-center gap-2">
          <Badge>{template.type}</Badge>
          <h5 className="text-sm font-semibold">{template.name}</h5>
        </div>
        {/* <p className="text-muted-foreground flex items-center gap-1 text-xs"></p> */}
      </HoverCardContent>
    </HoverCard>
  );
}

import { Badge } from "@/components/ui/badge";
import { HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FacilitySelectType } from "@/server/db/schema";
import { api } from "@/trpc/react";
import { HoverCard } from "@radix-ui/react-hover-card";
import { MapPinIcon } from "lucide-react";

export function FacilityHoverCard({
  facility,
}: {
  facility: FacilitySelectType;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Badge
          variant="outline"
          className="hover:bg-muted cursor-pointer text-xs"
        >
          {facility.name}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h5 className="text-sm font-semibold">{facility.name}</h5>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPinIcon className="size-3" />
            <span>{facility.address}</span>
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

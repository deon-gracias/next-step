"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2Icon } from "lucide-react";
import { useDebounce } from "@uidotdev/usehooks";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ALIGN_OPTIONS } from "@radix-ui/react-popper";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { TemplateSelectType } from "@/server/db/schema";

interface ComboboxPropsBase {
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  align?: (typeof ALIGN_OPTIONS)[number];
}
interface ComboboxIdMode extends ComboboxPropsBase {
  withValue?: false;
  onSelect: (id: number) => void;
  selectedItem?: number;
}
interface ComboboxFullMode extends ComboboxPropsBase {
  withValue: true;
  onSelect: (item: TemplateSelectType) => void;
  selectedItem?: TemplateSelectType;
}
type ComboboxProps = ComboboxIdMode | ComboboxFullMode;

export function TemplateComboBox({
  selectedItem,
  onSelect,
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  withValue,
  align,
}: ComboboxProps) {
  const [open, setOpenState] = React.useState(false);
  const [input, setInput] = React.useState<string>("");

  const debouncedInput = useDebounce(input, 300);
  const handleOnSearchChange = (e: string) => setInput(e);
  // (e === "" && fetchItems(e)) || debouncedFetchItems(e);

  const items = api.template.list.useQuery({ name: debouncedInput });

  function setOpen(isOpen: boolean) {
    if (isOpen) {
      handleOnSearchChange("");
    }
    setOpenState(isOpen);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
        >
          <span className="flex items-center truncate">
            {(
              items.data &&
              items.data.data.find((e) =>
                withValue && selectedItem
                  ? e.id === selectedItem.id
                  : e.id === selectedItem,
              )
            )?.name || "Select an item"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className={cn("p-0")}
        align={align}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={handleOnSearchChange}
          />
          <CommandList>
            <CommandEmpty>No template found</CommandEmpty>

            {items.isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <CommandItem key={i} className="p-0">
                  <Skeleton className="mb-1 h-8 w-full rounded" />
                </CommandItem>
              ))}

            <CommandGroup>
              {!items.isPending &&
                items.data &&
                items.data.data.map((item) => {
                  if (!item.name) {
                    return null;
                  }
                  const isSelected = selectedItem === item.id;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      keywords={[item.name]}
                      onSelect={() => {
                        if (withValue) onSelect(item);
                        else onSelect(item.id);

                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <Badge className="capitalize">{item.type}</Badge>
                      {item.name}
                      <Badge variant={"outline"}>
                        Points: {item.totalPoints}
                      </Badge>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

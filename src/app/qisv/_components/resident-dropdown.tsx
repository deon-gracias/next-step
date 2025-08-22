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
import { CommandLoading } from "cmdk";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { ResidentSelectType } from "@/server/db/schema";

type ComboboxProps = {
  selectedItem?: number;
  onSelect: (item: number) => void;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  align?: (typeof ALIGN_OPTIONS)[number];
  searchDebounce?: number;
};

export function ResidentComboBox({
  selectedItem,
  onSelect,
  searchPlaceholder = "Search...",
  className,
  disabled = false,
  align,
  searchDebounce = 300,
}: ComboboxProps) {
  const [open, setOpenState] = React.useState(false);
  const [input, setInput] = React.useState<string>("");

  const debouncedInput = useDebounce(input, searchDebounce);
  const handleOnSearchChange = (e: string) => setInput(e);

  const items = api.resident.list.useQuery({
    name: debouncedInput,
    pcciId: debouncedInput,
    matchType: "OR",
  });

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
            {(items.data && items.data?.data.find((e) => e.id === selectedItem))
              ?.name || "Select a resident"}
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
            <CommandEmpty>No Resident found</CommandEmpty>

            {items.isPending && (
              <CommandGroup>
                {Array.from({ length: 4 }).map((_, i) => (
                  <CommandItem key={i} className="p-0">
                    <Skeleton className="mb-1 h-8 w-full rounded" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

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
                      keywords={[item.name, item.pcciId]}
                      onSelect={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                    >
                      <Badge variant={"outline"}>{item.pcciId}</Badge>{" "}
                      {item.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
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

type MultiSelectProps = {
  filterParams?: Partial<ResidentSelectType>;
  selectedItems: number[];
  onChange: (items: number[]) => void;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
};

export function ResidentMultiSelectComboBox({
  filterParams,
  selectedItems,
  onChange,
  searchPlaceholder = "Search...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpenState] = React.useState(false);
  const [input, setInput] = React.useState("");

  const debouncedInput = useDebounce(input, 300);
  const items = api.resident.list.useQuery({
    name: debouncedInput,
    pcciId: debouncedInput,
    ...filterParams,
  });

  const [selectedMap, setSelectedMap] = React.useState<Record<number, string>>(
    {},
  );

  const handleSelect = (id: number, code: string) => {
    const exists = selectedItems.includes(id);
    if (exists) {
      onChange(selectedItems.filter((item) => item !== id));
      setSelectedMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      onChange([...selectedItems, id]);
      setSelectedMap((prev) => ({
        ...prev,
        [id]: code,
      }));
    }
  };

  React.useEffect(() => {
    if (items.data) {
      const newlyVisible = items.data.data.filter(
        (item) => selectedItems.includes(item.id) && !selectedMap[item.id],
      );
      if (newlyVisible.length > 0) {
        setSelectedMap((prev) => {
          const next = { ...prev };
          newlyVisible.forEach((item) => {
            next[item.id] = item.name;
          });
          return next;
        });
      }
    }
  }, [items.data, selectedItems, selectedMap]);

  function setOpen(isOpen: boolean) {
    if (isOpen) setInput("");
    setOpenState(isOpen);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-h-10 justify-between", className)}
          disabled={disabled}
        >
          <div className="flex max-w-[80%] flex-wrap items-center gap-1 truncate">
            {selectedItems.length === 0 && (
              <span className="text-muted-foreground">Select Residents</span>
            )}
            {selectedItems.map((id) => (
              <Badge key={id} variant="outline">
                {selectedMap[id] ?? `#${id}`}
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={setInput}
          />
          <CommandList>
            <CommandEmpty>No Residents found</CommandEmpty>

            <CommandGroup>
              {items.isPending &&
                Array.from({ length: 4 }).map((_, i) => (
                  <CommandItem key={i} className="p-0">
                    <Skeleton className="mb-1 h-8 w-full rounded" />
                  </CommandItem>
                ))}

              {!items.isPending &&
                items.data &&
                items.data.data.map((item) => {
                  if (!item.name) {
                    return null;
                  }
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      keywords={[item.name, item.pcciId]}
                      onSelect={() => handleSelect(item.id, item.pcciId)}
                    >
                      <Badge variant={"outline"}>{item.pcciId}</Badge>{" "}
                      {item.name}
                      <Check
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
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

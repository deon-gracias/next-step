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
import { authClient } from "@/components/providers/auth-client";
import { useQuery } from "@tanstack/react-query";
import type { roles } from "@/lib/permissions";

type ComboboxProps = {
  selectedItem?: string;
  onSelect: (item: string) => void;
  role?: (typeof roles)[number]["label"];
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  align?: (typeof ALIGN_OPTIONS)[number];
};

export function UserComboBox({
  selectedItem,
  onSelect,
  searchPlaceholder = "Search...",
  className,
  role,
  disabled = false,
  align,
}: ComboboxProps) {
  const [open, setOpenState] = React.useState(false);
  const [input, setInput] = React.useState<string>("");

  const debouncedInput = useDebounce(input, 300);
  const handleOnSearchChange = (e: string) => setInput(e);
  // (e === "" && fetchItems(e)) || debouncedFetchItems(e);

  const activeOrganization = authClient.useActiveOrganization();
  const items = api.user.listInOrg.useQuery(
    {
      organizationId: activeOrganization.data?.id ?? "",
      search: debouncedInput,
      role: role,
    },
    { enabled: !!activeOrganization.data },
  );

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
            <span className="flex items-center truncate">
              {items.data?.find((e) => e.id === selectedItem)?.email ||
                "Select an item"}
            </span>
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
            <CommandEmpty>No user found</CommandEmpty>

            {items.isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <CommandItem key={i} className="p-0">
                  <Skeleton className="mb-1 h-8 w-full rounded" />
                </CommandItem>
              ))}

            <CommandGroup>
              {!items.isPending &&
                items.data &&
                items.data.map((item) => {
                  if (!item.email) {
                    return null;
                  }
                  const isSelected = selectedItem === item.id;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.email}
                      keywords={[item.email]}
                      onSelect={() => {
                        onSelect(item.id);
                        setOpen(false);
                      }}
                    >
                      {item.email}
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

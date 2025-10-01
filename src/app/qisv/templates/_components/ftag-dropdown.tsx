"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

interface FtagMultiSelectComboBoxProps {
  selectedItems: number[];
  onChange: (items: number[]) => void;
  placeholder?: string;
}

export function FtagMultiSelectComboBox({
  selectedItems = [],
  onChange,
  placeholder = "Select F-tags...",
}: FtagMultiSelectComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch all F-tags with search
  const { data: ftags = [] } = api.ftag.search.useQuery(
    { query: search },
    {
      placeholderData: (previousData) => previousData,
    }
  );

  // Also get selected F-tags details for display
  const { data: selectedFtags = [] } = api.ftag.getAll.useQuery(
    undefined,
    {
      select: (allFtags) => allFtags.filter(ftag => selectedItems.includes(ftag.id))
    }
  );

  const handleSelect = (ftagId: number) => {
    const newValue = selectedItems.includes(ftagId)
      ? selectedItems.filter((id) => id !== ftagId)
      : [...selectedItems, ftagId];
    onChange(newValue);
  };

  const handleRemove = (ftagId: number) => {
    onChange(selectedItems.filter((id) => id !== ftagId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedItems.length === 0
              ? placeholder
              : `${selectedItems.length} F-tag${selectedItems.length > 1 ? "s" : ""} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search F-tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No F-tags found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {ftags.map((ftag) => (
                  <CommandItem
                    key={ftag.id}
                    value={ftag.code}
                    onSelect={() => handleSelect(ftag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedItems.includes(ftag.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-mono font-semibold">{ftag.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected F-tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFtags.map((ftag) => (
            <Badge
              key={ftag.id}
              variant="secondary"
              className="font-mono text-xs"
            >
              {ftag.code}
              <button
                type="button"
                onClick={() => handleRemove(ftag.id)}
                className="ml-1 h-3 w-3 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

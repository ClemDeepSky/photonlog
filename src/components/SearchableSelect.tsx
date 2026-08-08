import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  id?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Option values always visible, even while filtering (e.g. "Autre…") */
  alwaysShowValues?: string[];
};

const SearchableSelect = ({
  id,
  options,
  value,
  onChange,
  placeholder = "Choisir…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat",
  alwaysShowValues = ["__other__"],
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const pinned = options.filter((o) => alwaysShowValues.includes(o.value));
  const regular = options.filter((o) => !alwaysShowValues.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {regular.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === o.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {o.label}
                    {o.hint && (
                      <span className="text-muted-foreground"> — {o.hint}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {pinned.length > 0 && (
              <CommandGroup forceMount className="border-t">
                {pinned.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    forceMount
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === o.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;

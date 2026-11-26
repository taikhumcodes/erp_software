import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ProductComboboxProps {
  products: any[]
  value: string
  onSelect: (productId: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ProductCombobox({ products, value, onSelect, disabled, placeholder = "Select product..." }: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedProduct = React.useMemo(() => {
    return products.find((product) => product.id === value)
  }, [products, value])

  const { filteredProducts, totalMatches } = React.useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) {
      return {
        filteredProducts: products.slice(0, 200),
        totalMatches: products.length,
      };
    }
    const lowerSearch = trimmed.toLowerCase();
    const matches = products.filter((p) =>
      `${p.name ?? ''} ${p.nameAr ?? ''} ${p.sku ?? ''}`
        .toLowerCase()
        .includes(lowerSearch)
    );
    return {
      filteredProducts: matches.slice(0, 150),
      totalMatches: matches.length,
    };
  }, [products, search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name or code..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.sku} ${product.id}`}
                  onSelect={() => {
                    onSelect(product.id)
                    handleOpenChange(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.sku}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {totalMatches > filteredProducts.length && (
              <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t">
                Showing {filteredProducts.length} of {totalMatches} — type to filter
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

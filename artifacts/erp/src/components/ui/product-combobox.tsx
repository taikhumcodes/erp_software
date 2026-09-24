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

  const filteredProducts = React.useMemo(() => {
    if (!search) return products.slice(0, 50);
    const lowerSearch = search.toLowerCase();
    return products.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(lowerSearch)).slice(0, 50);
  }, [products, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-[300px] p-0" align="start">
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
                    setOpen(false)
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

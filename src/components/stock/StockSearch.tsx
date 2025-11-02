import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { twelveDataService, type StockSearchResult } from "@/services/twelveDataService";
import { useToast } from "@/hooks/use-toast";

interface StockSearchProps {
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export function StockSearch({ onSelect, placeholder = "Search stocks...", className }: StockSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 1) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await twelveDataService.searchStocks(searchQuery);
        setResults(data.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error("Error searching stocks:", error);
        toast({
          title: "Search Error",
          description: "Failed to search stocks. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, toast]);

  const handleSelect = (symbol: string, name: string) => {
    setSelectedValue(`${symbol} - ${name}`);
    setOpen(false);
    onSelect(symbol);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Search className="h-4 w-4 animate-pulse mx-auto mb-2" />
                Searching...
              </div>
            ) : results.length === 0 && searchQuery ? (
              <CommandEmpty>No stocks found.</CommandEmpty>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search stocks
              </div>
            ) : (
              <CommandGroup>
                {results.map((stock) => (
                  <CommandItem
                    key={`${stock.symbol}-${stock.exchange}`}
                    value={stock.symbol}
                    onSelect={() => handleSelect(stock.symbol, stock.instrument_name)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue.startsWith(stock.symbol) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {stock.instrument_name} · {stock.exchange}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { twelveDataService, type TimeSeriesData, type StockQuote } from "@/services/twelveDataService";
import { useToast } from "@/hooks/use-toast";
import { StockSearch } from "./StockSearch";
import { format } from "date-fns";

interface StockComparisonProps {
  baseSymbol: string;
  comparisonSymbols: string[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
}

interface StockData {
  symbol: string;
  quote: StockQuote | null;
  timeSeries: TimeSeriesData | null;
  color: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(142, 76%, 36%)', // green
  'hsl(262, 83%, 58%)', // purple
  'hsl(24, 95%, 53%)',  // orange
];

export function StockComparison({ baseSymbol, comparisonSymbols, onAddSymbol, onRemoveSymbol }: StockComparisonProps) {
  const [stocksData, setStocksData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();

  const allSymbols = [baseSymbol, ...comparisonSymbols];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const dataPromises = allSymbols.map(async (symbol, index) => {
          const [quote, timeSeries] = await Promise.all([
            twelveDataService.getQuote(symbol),
            twelveDataService.getTimeSeries(symbol, '1day', 90)
          ]);
          return {
            symbol,
            quote,
            timeSeries,
            color: COLORS[index % COLORS.length],
          };
        });

        const data = await Promise.all(dataPromises);
        setStocksData(data);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch comparison data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (allSymbols.length > 0) {
      fetchData();
    }
  }, [baseSymbol, comparisonSymbols.join(','), toast]);

  // Normalize data to percentage change from first data point
  const normalizedChartData = () => {
    if (stocksData.length === 0) return [];

    const dates = stocksData[0]?.timeSeries?.values?.map(v => v.datetime).reverse() || [];

    return dates.map(date => {
      const dataPoint: any = { date };

      stocksData.forEach(stock => {
        const values = stock.timeSeries?.values?.slice().reverse() || [];
        const value = values.find(v => v.datetime === date);
        const firstValue = values[0];

        if (value && firstValue) {
          const currentPrice = parseFloat(value.close);
          const firstPrice = parseFloat(firstValue.close);
          dataPoint[stock.symbol] = ((currentPrice - firstPrice) / firstPrice) * 100;
        }
      });

      return dataPoint;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-96 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Normalized Performance (% Change)</CardTitle>
            {comparisonSymbols.length < 4 && (
              <Button
                onClick={() => setShowSearch(!showSearch)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Stock
              </Button>
            )}
          </div>
          {showSearch && (
            <div className="mt-4">
              <StockSearch
                onSelect={(symbol) => {
                  onAddSymbol(symbol);
                  setShowSearch(false);
                }}
                placeholder="Add stock to compare..."
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={normalizedChartData()}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '% Change', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{formatDate(payload[0].payload.date)}</p>
                        <div className="space-y-1 text-sm">
                          {payload.map((entry: any, index: number) => (
                            <p key={index} style={{ color: entry.color }}>
                              {entry.name}: {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}%
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {stocksData.map((stock, index) => (
                <Line
                  key={stock.symbol}
                  type="monotone"
                  dataKey={stock.symbol}
                  stroke={stock.color}
                  strokeWidth={index === 0 ? 3 : 2}
                  dot={false}
                  name={stock.symbol}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {stocksData.map((stock, index) => (
          <Card key={stock.symbol} className="relative">
            {index !== 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => onRemoveSymbol(stock.symbol)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: stock.color }}
                    />
                    <h3 className="text-xl font-bold">{stock.symbol}</h3>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Base
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stock.quote?.name}</p>
                </div>
              </div>

              {stock.quote && (
                <>
                  <div className="mb-3">
                    <p className="text-3xl font-bold">${parseFloat(stock.quote.close).toFixed(2)}</p>
                    <div className={`flex items-center gap-1 mt-1 ${
                      parseFloat(stock.quote.change) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(stock.quote.change) >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold">
                        {parseFloat(stock.quote.change) >= 0 ? '+' : ''}{parseFloat(stock.quote.change).toFixed(2)}
                      </span>
                      <span>
                        ({parseFloat(stock.quote.change) >= 0 ? '+' : ''}{parseFloat(stock.quote.percent_change).toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Open</p>
                      <p className="font-medium">${parseFloat(stock.quote.open).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volume</p>
                      <p className="font-medium">{formatVolume(parseInt(stock.quote.volume))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">High</p>
                      <p className="font-medium">${parseFloat(stock.quote.high).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Low</p>
                      <p className="font-medium">${parseFloat(stock.quote.low).toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {comparisonSymbols.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              Add stocks to compare their performance with {baseSymbol}
            </p>
            <Button onClick={() => setShowSearch(!showSearch)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Stock to Compare
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(2)}B`;
  } else if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  }
  return volume.toString();
}

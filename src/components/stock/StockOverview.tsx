import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Activity, Calendar } from "lucide-react";
import { twelveDataService, type StockQuote } from "@/services/twelveDataService";
import { useToast } from "@/hooks/use-toast";

interface StockOverviewProps {
  symbol: string;
}

export function StockOverview({ symbol }: StockOverviewProps) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const data = await twelveDataService.getQuote(symbol);
        setQuote(data);
      } catch (error) {
        console.error("Error fetching quote:", error);
        toast({
          title: "Error",
          description: "Failed to fetch stock quote. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [symbol, toast]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  const isPositive = parseFloat(quote.change) >= 0;
  const percentChange = parseFloat(quote.percent_change);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">{quote.symbol}</CardTitle>
            <p className="text-muted-foreground mt-1">{quote.name}</p>
          </div>
          <Badge variant={quote.is_market_open ? "default" : "secondary"}>
            {quote.is_market_open ? "Market Open" : "Market Closed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Current Price */}
        <div className="mb-6">
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-bold">${parseFloat(quote.close).toFixed(2)}</span>
            <div className={`flex items-center gap-1 pb-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
              <span className="text-xl font-semibold">
                {isPositive ? "+" : ""}{parseFloat(quote.change).toFixed(2)}
              </span>
              <span className="text-lg">
                ({isPositive ? "+" : ""}{percentChange.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {quote.currency} · {quote.exchange}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Previous Close"
            value={`$${parseFloat(quote.previous_close).toFixed(2)}`}
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Day Range"
            value={`$${parseFloat(quote.low).toFixed(2)} - $${parseFloat(quote.high).toFixed(2)}`}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Volume"
            value={formatVolume(parseInt(quote.volume))}
          />
          <MetricCard
            icon={<Calendar className="h-4 w-4" />}
            label="52 Week Range"
            value={`$${parseFloat(quote.fifty_two_week.low).toFixed(2)} - $${parseFloat(quote.fifty_two_week.high).toFixed(2)}`}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Open:</span>
              <span className="ml-2 font-medium">${parseFloat(quote.open).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Volume:</span>
              <span className="ml-2 font-medium">{formatVolume(parseInt(quote.average_volume))}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="ml-2 font-medium">{new Date(quote.datetime).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-semibold truncate">{value}</p>
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

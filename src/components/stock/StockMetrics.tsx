import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { twelveDataService, type TechnicalIndicator, type TimeSeriesData } from "@/services/twelveDataService";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Activity, BarChart3, Zap } from "lucide-react";
import { format } from "date-fns";

interface StockMetricsProps {
  symbol: string;
}

type IndicatorType = 'sma' | 'ema' | 'rsi' | 'macd';

export function StockMetrics({ symbol }: StockMetricsProps) {
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [indicator, setIndicator] = useState<TechnicalIndicator | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('sma');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [timeSeriesData, indicatorData] = await Promise.all([
          twelveDataService.getTimeSeries(symbol, '1day', 60),
          twelveDataService.getTechnicalIndicator(symbol, activeIndicator, '1day', activeIndicator === 'rsi' ? 14 : 20)
        ]);
        setTimeSeries(timeSeriesData);
        setIndicator(indicatorData);
      } catch (error) {
        console.error("Error fetching metrics:", error);
        toast({
          title: "Error",
          description: "Failed to fetch technical indicators. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, activeIndicator, toast]);

  const volumeData = timeSeries?.values?.map(item => ({
    date: item.datetime,
    volume: parseInt(item.volume) / 1000000, // Convert to millions
    close: parseFloat(item.close),
  })).reverse().slice(-30) || [];

  const indicatorData = indicator?.values?.map(item => {
    const result: any = {
      date: item.datetime,
    };

    Object.keys(item).forEach(key => {
      if (key !== 'datetime') {
        result[key] = parseFloat(item[key]);
      }
    });

    return result;
  }).reverse().slice(-30) || [];

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Trading Volume (30 Days)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
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
                label={{ value: 'Volume (M)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-1">{formatDate(payload[0].payload.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          Volume: <span className="font-medium text-foreground">{payload[0].value}M</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Technical Indicators</CardTitle>
            </div>
            <Tabs value={activeIndicator} onValueChange={(v) => setActiveIndicator(v as IndicatorType)}>
              <TabsList>
                <TabsTrigger value="sma">SMA</TabsTrigger>
                <TabsTrigger value="ema">EMA</TabsTrigger>
                <TabsTrigger value="rsi">RSI</TabsTrigger>
                <TabsTrigger value="macd">MACD</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={indicatorData}>
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
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{formatDate(payload[0].payload.date)}</p>
                        <div className="space-y-1 text-sm">
                          {payload.map((entry: any, index: number) => (
                            <p key={index} className="text-muted-foreground">
                              {entry.name}: <span className="font-medium text-foreground">{entry.value.toFixed(2)}</span>
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
              {activeIndicator === 'sma' && (
                <Line type="monotone" dataKey="sma" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="SMA (20)" />
              )}
              {activeIndicator === 'ema' && (
                <Line type="monotone" dataKey="ema" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="EMA (20)" />
              )}
              {activeIndicator === 'rsi' && (
                <>
                  <Line type="monotone" dataKey="rsi" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="RSI (14)" />
                </>
              )}
              {activeIndicator === 'macd' && (
                <>
                  <Line type="monotone" dataKey="macd" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="MACD" />
                  <Line type="monotone" dataKey="macd_signal" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Signal" />
                  <Line type="monotone" dataKey="macd_hist" stroke="hsl(var(--muted-foreground))" strokeWidth={1} dot={false} name="Histogram" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>

          {/* Indicator Explanations */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm space-y-1">
                {activeIndicator === 'sma' && (
                  <>
                    <p className="font-medium">Simple Moving Average (SMA)</p>
                    <p className="text-muted-foreground">
                      Average price over the last 20 periods. Helps identify trend direction and support/resistance levels.
                    </p>
                  </>
                )}
                {activeIndicator === 'ema' && (
                  <>
                    <p className="font-medium">Exponential Moving Average (EMA)</p>
                    <p className="text-muted-foreground">
                      Weighted average giving more importance to recent prices. More responsive to price changes than SMA.
                    </p>
                  </>
                )}
                {activeIndicator === 'rsi' && (
                  <>
                    <p className="font-medium">Relative Strength Index (RSI)</p>
                    <p className="text-muted-foreground">
                      Momentum oscillator (0-100). Values above 70 suggest overbought, below 30 suggest oversold conditions.
                    </p>
                  </>
                )}
                {activeIndicator === 'macd' && (
                  <>
                    <p className="font-medium">Moving Average Convergence Divergence (MACD)</p>
                    <p className="text-muted-foreground">
                      Trend-following indicator showing relationship between two moving averages. Signal line crossovers indicate buy/sell signals.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="30-Day High"
          value={`$${Math.max(...volumeData.map(d => d.close)).toFixed(2)}`}
          change="+5.2%"
          positive={true}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          title="30-Day Low"
          value={`$${Math.min(...volumeData.map(d => d.close)).toFixed(2)}`}
          change="-3.8%"
          positive={false}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="Avg Volume"
          value={`${(volumeData.reduce((sum, d) => sum + d.volume, 0) / volumeData.length).toFixed(2)}M`}
          change="+12.4%"
          positive={true}
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

function StatCard({ icon, title, value, change, positive }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

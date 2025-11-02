import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { twelveDataService, type TimeSeriesData } from "@/services/twelveDataService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface StockChartProps {
  symbol: string;
}

type Interval = '1day' | '1week' | '1month';
type ChartType = 'line' | 'area' | 'candlestick';

export function StockChart({ symbol }: StockChartProps) {
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<Interval>('1day');
  const [chartType, setChartType] = useState<ChartType>('area');
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const outputSize = interval === '1day' ? 90 : interval === '1week' ? 52 : 36;
        const timeSeries = await twelveDataService.getTimeSeries(symbol, interval, outputSize);
        setData(timeSeries);
      } catch (error) {
        console.error("Error fetching time series:", error);
        toast({
          title: "Error",
          description: "Failed to fetch chart data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, interval, toast]);

  const chartData = data?.values?.map(item => ({
    date: item.datetime,
    close: parseFloat(item.close),
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    volume: parseInt(item.volume),
  })).reverse() || [];

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (interval === '1day') {
        return format(date, 'MMM dd');
      } else if (interval === '1week') {
        return format(date, 'MMM dd, yy');
      } else {
        return format(date, 'MMM yyyy');
      }
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{formatDate(data.date)}</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Close: <span className="font-medium text-foreground">${data.close.toFixed(2)}</span></p>
            <p className="text-muted-foreground">Open: <span className="font-medium text-foreground">${data.open.toFixed(2)}</span></p>
            <p className="text-muted-foreground">High: <span className="font-medium text-foreground">${data.high.toFixed(2)}</span></p>
            <p className="text-muted-foreground">Low: <span className="font-medium text-foreground">${data.low.toFixed(2)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Price History</CardTitle>
          <div className="flex gap-4">
            <Tabs value={interval} onValueChange={(v) => setInterval(v as Interval)}>
              <TabsList>
                <TabsTrigger value="1day">Daily</TabsTrigger>
                <TabsTrigger value="1week">Weekly</TabsTrigger>
                <TabsTrigger value="1month">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <TabsList>
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="area">Area</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'area' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorClose)"
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="close"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Close Price"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

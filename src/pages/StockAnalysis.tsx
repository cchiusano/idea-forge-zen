import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, BarChart3, LineChart } from "lucide-react";
import { StockSearch } from "@/components/stock/StockSearch";
import { StockOverview } from "@/components/stock/StockOverview";
import { StockChart } from "@/components/stock/StockChart";
import { StockMetrics } from "@/components/stock/StockMetrics";
import { StockComparison } from "@/components/stock/StockComparison";
import { useToast } from "@/hooks/use-toast";

const StockAnalysis = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [comparisonSymbols, setComparisonSymbols] = useState<string[]>([]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    toast({
      title: "Stock Selected",
      description: `Now viewing ${symbol}`,
    });
  };

  const handleAddComparison = (symbol: string) => {
    if (!comparisonSymbols.includes(symbol) && comparisonSymbols.length < 4) {
      setComparisonSymbols([...comparisonSymbols, symbol]);
    }
  };

  const handleRemoveComparison = (symbol: string) => {
    setComparisonSymbols(comparisonSymbols.filter(s => s !== symbol));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-opacity-95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Stock Analysis
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time market data and insights
                </p>
              </div>
            </div>
            <div className="w-full max-w-md">
              <StockSearch onSelect={handleSymbolSelect} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {!selectedSymbol ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <LineChart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Welcome to Stock Analysis</h2>
              <p className="text-muted-foreground">
                Search for a stock symbol above to get started with real-time market data,
                technical analysis, and performance insights.
              </p>
              <div className="pt-4">
                <p className="text-sm font-medium mb-2">Popular stocks:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'].map(symbol => (
                    <Button
                      key={symbol}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSymbolSelect(symbol)}
                    >
                      {symbol}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            {/* Stock Overview */}
            <StockOverview symbol={selectedSymbol} />

            {/* Main Analysis Tabs */}
            <Tabs defaultValue="chart" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                <TabsTrigger value="chart" className="gap-2">
                  <LineChart className="h-4 w-4" />
                  <span>Chart</span>
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Metrics</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Compare</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="space-y-4">
                <StockChart symbol={selectedSymbol} />
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                <StockMetrics symbol={selectedSymbol} />
              </TabsContent>

              <TabsContent value="compare" className="space-y-4">
                <StockComparison
                  baseSymbol={selectedSymbol}
                  comparisonSymbols={comparisonSymbols}
                  onAddSymbol={handleAddComparison}
                  onRemoveSymbol={handleRemoveComparison}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockAnalysis;

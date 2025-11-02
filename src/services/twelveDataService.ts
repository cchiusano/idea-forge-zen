// Twelve Data API Service
// Documentation: https://twelvedata.com/docs

const TWELVE_DATA_API_KEY = import.meta.env.VITE_TWELVE_DATA_API_KEY || 'demo';
const BASE_URL = 'https://api.twelvedata.com';

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export interface TimeSeriesData {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

export interface StockSearchResult {
  symbol: string;
  instrument_name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  country: string;
  type: string;
}

export interface TechnicalIndicator {
  meta: {
    symbol: string;
    interval: string;
    indicator_name: string;
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
  status: string;
}

class TwelveDataService {
  private apiKey: string;

  constructor(apiKey: string = TWELVE_DATA_API_KEY) {
    this.apiKey = apiKey;
  }

  private async fetchData<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'API returned an error');
    }

    return data;
  }

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    const data = await this.fetchData<{ data: StockSearchResult[] }>('/symbol_search', {
      symbol: query,
    });
    return data.data || [];
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    return this.fetchData<StockQuote>('/quote', { symbol });
  }

  async getTimeSeries(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1h' | '4h' | '1day' | '1week' | '1month' = '1day',
    outputsize: number = 30
  ): Promise<TimeSeriesData> {
    return this.fetchData<TimeSeriesData>('/time_series', {
      symbol,
      interval,
      outputsize: outputsize.toString(),
    });
  }

  async getTechnicalIndicator(
    symbol: string,
    indicator: 'sma' | 'ema' | 'rsi' | 'macd' | 'bbands',
    interval: '1day' | '1week' | '1month' = '1day',
    timePeriod: number = 14
  ): Promise<TechnicalIndicator> {
    return this.fetchData<TechnicalIndicator>(`/${indicator}`, {
      symbol,
      interval,
      time_period: timePeriod.toString(),
    });
  }

  async getEarliestTimestamp(symbol: string): Promise<{ datetime: string; unix_time: number }> {
    return this.fetchData<{ datetime: string; unix_time: number }>('/earliest_timestamp', {
      symbol,
      interval: '1day',
    });
  }

  async getMarketMovers(direction: 'gainers' | 'losers' = 'gainers'): Promise<any> {
    return this.fetchData<any>(`/market_movers/${direction}`);
  }
}

export const twelveDataService = new TwelveDataService();

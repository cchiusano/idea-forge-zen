# Stock Analysis Tool

A beautiful and intuitive stock analysis tool integrated with Twelve Data API, providing real-time market data, technical indicators, and multi-stock comparison capabilities.

## Features

### 1. Real-Time Stock Search
- Search and select from thousands of stocks worldwide
- Autocomplete with stock symbol, name, and exchange information
- Support for major exchanges (NASDAQ, NYSE, etc.)

### 2. Comprehensive Stock Overview
- Live stock quotes with real-time updates (refreshes every 30 seconds)
- Current price with change indicators
- Key metrics: Open, High, Low, Volume, Previous Close
- 52-week range and market status

### 3. Interactive Price Charts
- Multiple timeframes: Daily, Weekly, Monthly
- Chart types: Line chart and Area chart
- Historical data up to 90 days (daily), 52 weeks (weekly), or 36 months (monthly)
- Responsive tooltips with OHLC data

### 4. Technical Analysis & Metrics
- **Volume Analysis**: 30-day trading volume visualization
- **Technical Indicators**:
  - Simple Moving Average (SMA)
  - Exponential Moving Average (EMA)
  - Relative Strength Index (RSI)
  - Moving Average Convergence Divergence (MACD)
- Interactive indicator switching
- Educational tooltips explaining each indicator

### 5. Stock Comparison
- Compare up to 5 stocks simultaneously
- Normalized performance view (% change)
- Side-by-side metrics comparison
- Color-coded visualization
- Easy add/remove functionality

## Setup Instructions

### 1. Get Your Twelve Data API Key

1. Visit [https://twelvedata.com/apikey](https://twelvedata.com/apikey)
2. Sign up for a free account
3. Copy your API key (free plan includes 800 API credits per day)

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Twelve Data API key:

```env
VITE_TWELVE_DATA_API_KEY=your_actual_api_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

### 5. Access the Stock Analysis Tool

- Navigate to the main dashboard
- Click on the "Stock Analysis" button in the header
- Or visit directly at `/stocks`

## Usage Guide

### Searching for Stocks

1. Click on the search bar in the header
2. Type a stock symbol (e.g., "AAPL", "GOOGL", "TSLA")
3. Select from the dropdown results
4. Or click on popular stocks in the welcome screen

### Viewing Stock Details

The **Chart** tab shows:
- Historical price movements
- Switchable timeframes (Daily/Weekly/Monthly)
- Multiple chart types (Line/Area)

The **Metrics** tab displays:
- Trading volume over 30 days
- Technical indicators (SMA, EMA, RSI, MACD)
- 30-day statistics (High, Low, Average Volume)

The **Compare** tab allows:
- Adding up to 4 additional stocks
- Viewing normalized performance
- Side-by-side metric comparison

### Comparing Multiple Stocks

1. Select your base stock
2. Navigate to the "Compare" tab
3. Click "Add Stock" button
4. Search and select stocks to compare
5. View normalized performance chart
6. Remove stocks by clicking the X button on their cards

## Technical Details

### API Integration

The tool uses the Twelve Data API for:
- Stock search and discovery
- Real-time quotes
- Historical time series data
- Technical indicators (SMA, EMA, RSI, MACD)

### Components Structure

```
src/
├── pages/
│   └── StockAnalysis.tsx          # Main page
├── components/stock/
│   ├── StockSearch.tsx            # Search component
│   ├── StockOverview.tsx          # Quote display
│   ├── StockChart.tsx             # Price charts
│   ├── StockMetrics.tsx           # Technical indicators
│   └── StockComparison.tsx        # Multi-stock comparison
└── services/
    └── twelveDataService.ts       # API service layer
```

### Key Libraries

- **React + TypeScript**: UI framework
- **Recharts**: Chart visualization
- **Shadcn/ui**: Component library
- **React Router**: Navigation
- **Date-fns**: Date formatting

## API Rate Limits

The free Twelve Data plan includes:
- 800 API credits per day
- Up to 8 requests per minute
- Access to all endpoints used by this tool

To optimize API usage:
- Quotes auto-refresh every 30 seconds (not every second)
- Chart data is cached during the session
- Search is debounced by 300ms

## Features Not Yet Implemented

Potential future enhancements:
- Real-time streaming data (WebSocket)
- Advanced technical indicators (Bollinger Bands, Fibonacci)
- News and sentiment analysis
- Portfolio tracking
- Watchlists
- Price alerts
- Export data to CSV/Excel

## Troubleshooting

### "API request failed" error
- Check that your API key is correctly set in `.env`
- Verify your API rate limit hasn't been exceeded
- Ensure you have internet connectivity

### Stock not found
- Try the full stock symbol (e.g., "AAPL" not "Apple")
- Some stocks may not be available in the Twelve Data database
- Check that the exchange is supported

### Charts not loading
- Refresh the page
- Check browser console for errors
- Verify API key is valid

## License

This stock analysis tool is part of the larger application. Please refer to the main project license.

## Credits

- Stock data provided by [Twelve Data](https://twelvedata.com)
- Built with React, TypeScript, and Shadcn/ui
- Charts powered by Recharts

---

**Note**: This tool is for informational purposes only. It should not be considered financial advice. Always do your own research before making investment decisions.

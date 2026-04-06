# CryptoPulse 2077

> **Wake up, Samurai. We have a market to burn.**

Neural Finance Terminal with Cyberpunk 2077 aesthetic. Real-time crypto, forex & futures analytics with AI-powered insights.

## Features

- **Multi-Market Dashboard** — Crypto (CoinGecko API), Forex, Futures with live price jitter
- **AI Market Analysis** — Gemini 2.5 Flash integration for professional trading insights
- **TradingView Charts** — OHLC candlestick charts via Lightweight Charts
- **Simulated Trading** — LONG/SHORT positions with configurable leverage
- **Portfolio & Analytics** — Asset allocation, performance tracking, PnL monitoring
- **Coin Comparison** — Side-by-side relative performance analysis
- **Top Traders Leaderboard** — Copy-trade system
- **Gamification** — XP, levels, achievements
- **Admin Panel** — User management, system config, market volatility control
- **Web3 Wallet** — MetaMask/WalletConnect integration
- **Multi-currency** — USD/EUR/RUB support
- **Responsive** — Desktop + Mobile with bottom nav

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | TailwindCSS 3 + Cyberpunk 2077 Design System |
| Charts | Recharts + TradingView Lightweight Charts |
| AI | Google Gemini 2.5 Flash |
| Icons | Lucide React |
| Routing | React Router v7 |

## Design

Cyberpunk 2077 aesthetic:
- CRT scanline overlay & noise filter
- Orbitron (headings) + Rajdhani (body) + JetBrains Mono (code)
- Neon cyan (#00f3ff), magenta (#ff00ff), yellow (#fcee0a)
- Cyber-card components with corner accents
- Glow effects, grid overlays

## Getting Started

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

### Environment Variables

```bash
cp .env.example .env
# Add your Gemini API key for AI features (optional)
GEMINI_API_KEY=your_key_here
```

## License

MIT

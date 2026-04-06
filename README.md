<div align="center">

![CryptoPulse 2077](https://socialify.git.ci/PavelHopson/CryptoPulse/image?description=1&descriptionEditable=Neural%20Finance%20Terminal%20%E2%80%94%20Cyberpunk%20Trading%20Platform&font=Source%20Code%20Pro&language=1&name=1&pattern=Circuit%20Board&theme=Dark&owner=1)

# CRYPTOPULSE // 2077

### *Wake up, Samurai. We have a market to burn.*

**Real-time crypto, forex & futures analytics with AI-powered insights.**<br/>
**Built with Cyberpunk 2077 aesthetic.**

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-00f3ff?style=for-the-badge&logo=cloudflarepages&logoColor=black)](https://cryptopulse-1d0.pages.dev)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev)

</div>

---

<div align="center">

| <img width="100%" src="https://img.shields.io/badge/CRYPTO-Dashboard-00f3ff?style=flat-square"/> | <img width="100%" src="https://img.shields.io/badge/AI-Analysis-a855f7?style=flat-square"/> | <img width="100%" src="https://img.shields.io/badge/TRADE-Terminal-00ff9d?style=flat-square"/> | <img width="100%" src="https://img.shields.io/badge/ADMIN-Panel-ff00aa?style=flat-square"/> |
|:---:|:---:|:---:|:---:|
| Real-time market data | Gemini 2.5 Flash | LONG / SHORT orders | Full system control |

</div>

---

## Features

<table>
<tr>
<td width="50%">

### Market & Analytics
- Real-time **Crypto** prices (CoinGecko API)
- **Forex** & **Futures** markets (EUR/USD, Gold, S&P 500)
- **TradingView** OHLC candlestick charts
- **Technical Analysis** (RSI, MACD, EMA, SMA, Ichimoku)
- **Coin Comparison** — relative performance (ROI %)
- **News Feed** — live market news via RSS

</td>
<td width="50%">

### Trading & Portfolio
- **Simulated Trading** — LONG/SHORT with 1x-100x leverage
- **Portfolio Management** — positions, PnL, margin tracking
- **Deposit System** — RUB/USD/EUR, Card/SBP/Crypto
- **Copy Trading** — replicate top traders' strategies
- **Transaction History** — full audit trail with reports

</td>
</tr>
<tr>
<td width="50%">

### AI & Intelligence
- **Gemini AI Analyst** — professional market insights
- **Trading Signals** — BUY/SELL/HOLD recommendations
- **Sentiment Analysis** — bullish/bearish trend detection
- **Technical Reports** — generated analysis per asset

</td>
<td width="50%">

### Platform
- **Admin Panel** — user management, system config, logs
- **Gamification** — XP, levels, achievements
- **Web3 Wallet** — MetaMask/WalletConnect
- **Pricing Tiers** — Free / Pro / Whale Club
- **Multi-language** — Russian / English
- **Responsive** — Desktop + Mobile

</td>
</tr>
</table>

## Tech Stack

```
Frontend      React 19 + TypeScript + Vite 6
Styling       TailwindCSS 3 + Custom Cyberpunk Design System
Charts        Recharts + TradingView Lightweight Charts
AI            Google Gemini 2.5 Flash
Icons         Lucide React
Routing       React Router v7
State         localStorage + Custom Services
Deployment    Cloudflare Pages
```

## Cyberpunk Design System

<table>
<tr>
<td align="center"><img src="https://img.shields.io/badge/-%2305000a-05000a?style=for-the-badge" width="80"/><br/><code>#05000a</code><br/>Background</td>
<td align="center"><img src="https://img.shields.io/badge/-%2300f3ff-00f3ff?style=for-the-badge" width="80"/><br/><code>#00f3ff</code><br/>Cyan</td>
<td align="center"><img src="https://img.shields.io/badge/-%23ff00aa-ff00aa?style=for-the-badge" width="80"/><br/><code>#ff00aa</code><br/>Pink</td>
<td align="center"><img src="https://img.shields.io/badge/-%23ff00ff-ff00ff?style=for-the-badge" width="80"/><br/><code>#ff00ff</code><br/>Magenta</td>
<td align="center"><img src="https://img.shields.io/badge/-%23fcee0a-fcee0a?style=for-the-badge" width="80"/><br/><code>#fcee0a</code><br/>Yellow</td>
<td align="center"><img src="https://img.shields.io/badge/-%2300ff9d-00ff9d?style=for-the-badge" width="80"/><br/><code>#00ff9d</code><br/>Green</td>
</tr>
</table>

**Fonts:** Orbitron (headings) + Rajdhani (body) + JetBrains Mono (code)

**Effects:** CRT scanline overlay, fractal noise texture, neon glow shadows, cyber-card corner accents, grid background

## Quick Start

```bash
# Clone
git clone https://github.com/PavelHopson/CryptoPulse.git
cd CryptoPulse

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables (optional)

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis features |

> AI features work without the key — they'll show a fallback message.

## Project Structure

```
src/
  App.tsx                    # Router & app entry
  main.tsx                   # React DOM render
  styles.css                 # Cyberpunk design system (CSS)
  types.ts                   # TypeScript interfaces
  components/
    Layout.tsx               # Main layout with nav, notifications, wallet
    AIInsight.tsx             # Gemini AI analysis widget
    TradingViewChart.tsx      # OHLC candlestick charts
    TradeModal.tsx            # Trading order form (LONG/SHORT)
    DepositModal.tsx          # Fund deposit (Card/SBP/Crypto)
    SettingsModal.tsx         # User settings (profile, security, prefs)
    TechAnalysisModal.tsx     # Technical analysis (RSI, MACD gauge)
    PortfolioAnalytics.tsx    # Asset allocation & performance charts
    WalletModal.tsx           # Web3 wallet connection
    MockAd.tsx                # Ad banner (free tier)
  pages/
    Dashboard.tsx             # Market overview (crypto/forex/futures)
    CoinDetail.tsx            # Individual asset page + chart + AI
    Comparison.tsx            # Side-by-side asset comparison
    Favorites.tsx             # Watchlist
    Leaderboard.tsx           # Top traders + copy trading
    Profile.tsx               # User profile + positions + portfolio
    PricingPage.tsx           # Subscription tiers
    LoginPage.tsx             # Auth (login/register)
    AdminPanel.tsx            # System admin (users, config, logs)
  services/
    cryptoService.ts          # CoinGecko API + mock data + OHLC gen
    userService.ts            # Auth, profile, trading, localStorage
    geminiService.ts          # Google Gemini AI integration
    adminService.ts           # System config & user management
    newsService.ts            # RSS news feed (Investing.com)
    gamificationService.ts    # XP, levels, achievements
    communityService.ts       # Leaderboard data
    reportService.ts          # Transaction reports (CSV)
    web3Service.ts            # MetaMask/WalletConnect
```

## License

[MIT](LICENSE)

---

<div align="center">

**Built with React + Cyberpunk 2077 vibes**

<sub>CryptoPulse 2077 is a demo/portfolio project. Not financial advice. Trade simulation only.</sub>

</div>

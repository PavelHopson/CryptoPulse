import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// ---- Crypto Icons ----

export function IconBTC({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#F7931A" />
      <path
        d="M15.5 10.2c.2-1.5-1-2.3-2.6-2.8l.5-2.1-1.3-.3-.5 2c-.3-.1-.7-.2-1-.3l.5-2-1.3-.3-.5 2.1c-.3-.1-.5-.1-.8-.2l-1.7-.4-.4 1.4s1 .2 1 .2c.5.1.6.5.6.8l-.6 2.5c0 .1.1.1.1.1l-.1 0-.9 3.5c-.1.2-.3.4-.7.3 0 0-1-.2-1-.2l-.7 1.5 1.6.4c.3.1.6.2.9.2l-.5 2.1 1.3.3.5-2.1c.4.1.7.2 1 .3l-.5 2.1 1.3.3.5-2.1c2.2.4 3.8.2 4.5-1.7.5-1.5 0-2.4-1.1-3 .8-.2 1.4-.7 1.6-1.8zm-2.8 4c-.4 1.5-2.8.7-3.6.5l.6-2.6c.8.2 3.4.6 3 2.1zm.4-4c-.3 1.4-2.4.7-3 .5l.6-2.3c.7.2 2.8.5 2.4 1.8z"
        fill="white"
      />
    </svg>
  );
}

export function IconETH({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#627EEA" />
      <path d="M12 3.5l-5 8.5 5 3 5-3-5-8.5z" fill="white" fillOpacity="0.6" />
      <path d="M12 3.5v8.5l5 3-5-11.5z" fill="white" fillOpacity="0.9" />
      <path d="M12 16l-5-3 5 7.5 5-7.5-5 3z" fill="white" fillOpacity="0.6" />
      <path d="M12 16v7.5l5-7.5-5 3z" fill="white" fillOpacity="0.9" />
    </svg>
  );
}

export function IconBNB({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#F3BA2F" />
      <path d="M12 5l2 2-3.5 3.5L12 12l3.5-3.5L12 5zm-5 5l2-2 2 2-2 2-2-2zm10 0l-2-2-2 2 2 2 2-2zM12 14.5L8.5 11 7 12.5l5 5 5-5L15.5 11 12 14.5z" fill="white" />
    </svg>
  );
}

export function IconSOL({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="sol-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#sol-grad)" />
      <path d="M7 15.5h8.5l2-2H7l0 2zm0-4h10.5l-2-2H7v2zm8.5-3H7l2 2h8.5l-2-2z" fill="white" />
    </svg>
  );
}

export function IconXRP({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#23292F" />
      <path d="M7 6.5l3.5 4.5L12 12.5l1.5-1.5L17 6.5h-2.5L12 9.5 9.5 6.5H7zm0 11l2.5 0 2.5-3 2.5 3h2.5l-3.5-4.5-1.5-1.5-1.5 1.5L7 17.5z" fill="white" />
    </svg>
  );
}

export function IconADA({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#0033AD" />
      <circle cx="12" cy="6" r="1.2" fill="white" />
      <circle cx="12" cy="18" r="1.2" fill="white" />
      <circle cx="6.5" cy="9" r="1.2" fill="white" />
      <circle cx="17.5" cy="9" r="1.2" fill="white" />
      <circle cx="6.5" cy="15" r="1.2" fill="white" />
      <circle cx="17.5" cy="15" r="1.2" fill="white" />
      <circle cx="12" cy="12" r="2" fill="white" fillOpacity="0.3" />
    </svg>
  );
}

export function IconDOGE({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#C2A633" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="monospace">D</text>
    </svg>
  );
}

export function IconDOT({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#E6007A" />
      <circle cx="12" cy="7" r="2.5" fill="white" />
      <circle cx="12" cy="17" r="2.5" fill="white" />
      <circle cx="12" cy="12" r="1.5" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

export function IconAVAX({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#E84142" />
      <path d="M8.5 16h-2l5.5-10 2 3.5L11 16H9.5l2.5-4.5-1-1.8L8.5 16zm7 0h-2l-1.5-2.5 1-1.8L15.5 16z" fill="white" />
    </svg>
  );
}

export function IconLINK({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#2A5ADA" />
      <path d="M12 4l-2 1.2v3.6L7 10.5v4.2L12 17.5l5-2.8v-4.2l-3-1.7V5.2L12 4zm0 2.4l1.5.9v2.4l-1.5.9-1.5-.9V7.3L12 6.4zm-3.5 5l1.5-.9 1.5.9v1.8l-1.5.9-1.5-.9v-1.8zm5 0l1.5-.9 1.5.9v1.8l-1.5.9-1.5-.9v-1.8z" fill="white" />
    </svg>
  );
}

// ---- Forex Flag Icons ----

export function FlagEU({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#003399" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 12 + 7 * Math.cos(rad);
        const cy = 12 + 7 * Math.sin(rad);
        return <circle key={angle} cx={cx} cy={cy} r="1" fill="#FFCC00" />;
      })}
    </svg>
  );
}

export function FlagUS({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#B22234" />
      <rect x="1" y="5" width="22" height="2" fill="white" rx="0.5" />
      <rect x="1" y="9" width="22" height="2" fill="white" rx="0.5" />
      <rect x="1" y="13" width="22" height="2" fill="white" rx="0.5" />
      <rect x="1" y="17" width="22" height="2" fill="white" rx="0.5" />
      <rect x="1" y="3" width="10" height="10" fill="#3C3B6E" />
      <circle cx="4" cy="5.5" r="0.6" fill="white" />
      <circle cx="7" cy="5.5" r="0.6" fill="white" />
      <circle cx="5.5" cy="7.5" r="0.6" fill="white" />
      <circle cx="4" cy="9.5" r="0.6" fill="white" />
      <circle cx="7" cy="9.5" r="0.6" fill="white" />
      <circle cx="9.5" cy="5.5" r="0.6" fill="white" />
      <circle cx="9.5" cy="9.5" r="0.6" fill="white" />
      <clipPath id="us-clip"><circle cx="12" cy="12" r="11" /></clipPath>
    </svg>
  );
}

export function FlagJP({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="white" stroke="#ddd" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="5" fill="#BC002D" />
    </svg>
  );
}

export function FlagRU({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#0039A6" />
      <clipPath id="ru-clip"><circle cx="12" cy="12" r="11" /></clipPath>
      <g clipPath="url(#ru-clip)">
        <rect x="0" y="0" width="24" height="8" fill="white" />
        <rect x="0" y="8" width="24" height="8" fill="#0039A6" />
        <rect x="0" y="16" width="24" height="8" fill="#D52B1E" />
      </g>
    </svg>
  );
}

export function FlagCN({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#DE2910" />
      <circle cx="8" cy="9" r="2.5" fill="#FFDE00" />
      <circle cx="13" cy="5.5" r="0.8" fill="#FFDE00" />
      <circle cx="15.5" cy="7" r="0.8" fill="#FFDE00" />
      <circle cx="15.5" cy="10" r="0.8" fill="#FFDE00" />
      <circle cx="13" cy="11.5" r="0.8" fill="#FFDE00" />
    </svg>
  );
}

export function FlagGB({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#012169" />
      <clipPath id="gb-clip"><circle cx="12" cy="12" r="11" /></clipPath>
      <g clipPath="url(#gb-clip)">
        <path d="M0 0l24 24M24 0L0 24" stroke="white" strokeWidth="4" />
        <path d="M0 0l24 24M24 0L0 24" stroke="#C8102E" strokeWidth="2" />
        <path d="M12 0v24M0 12h24" stroke="white" strokeWidth="6" />
        <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="3" />
      </g>
    </svg>
  );
}

// ---- Commodity / Index Icons ----

export function IconGold({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <rect x="4" y="10" width="16" height="8" rx="1" fill="url(#gold-grad)" />
      <rect x="6" y="12" width="4" height="4" rx="0.5" fill="#FFD700" fillOpacity="0.3" stroke="#FFD700" strokeWidth="0.5" />
      <path d="M5 10L8 6h8l3 4" fill="url(#gold-grad)" fillOpacity="0.8" />
      <text x="15" y="16.5" textAnchor="middle" fill="#8B6914" fontSize="5" fontWeight="bold" fontFamily="monospace">Au</text>
    </svg>
  );
}

export function IconOil({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="oil-grad" x1="12" y1="2" x2="12" y2="22">
          <stop offset="0%" stopColor="#444" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>
      <path d="M12 2C12 2 7 9 7 14a5 5 0 0010 0c0-5-5-12-5-12z" fill="url(#oil-grad)" />
      <ellipse cx="10" cy="12" rx="1.5" ry="3" fill="white" fillOpacity="0.15" />
    </svg>
  );
}

export function IconSP500({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#1a237e" />
      <polyline points="4,16 8,13 11,15 15,9 20,7" stroke="#4CAF50" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="21" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" fontFamily="sans-serif">S&amp;P</text>
    </svg>
  );
}

export function IconNasdaq({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#0d1b2a" />
      <polyline points="4,17 7,14 10,16 14,8 17,10 20,5" stroke="#00bcd4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="5" r="1.5" fill="#00bcd4" fillOpacity="0.5" />
      <text x="12" y="21" textAnchor="middle" fill="#00bcd4" fontSize="3.5" fontWeight="bold" fontFamily="monospace">NDQ</text>
    </svg>
  );
}

// ---- Fallback Icons ----

export function IconCryptoDefault({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" fill="#374151" stroke="#6B7280" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
      <text x="12" y="15.5" textAnchor="middle" fill="white" fillOpacity="0.7" fontSize="8" fontWeight="bold" fontFamily="monospace">$</text>
    </svg>
  );
}

export function IconImageFallback({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#1F2937" stroke="#4B5563" strokeWidth="1" />
      <path d="M8 14l3-3 2 2 3-4 4 5H4z" fill="#6B7280" fillOpacity="0.4" />
      <circle cx="8" cy="8" r="2" fill="#6B7280" fillOpacity="0.4" />
      <line x1="4" y1="4" x2="20" y2="20" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  );
}

// ---- Avatar Default ----

export function AvatarDefault({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1F2937" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="20" cy="15" r="6" fill="#4B5563" />
      <path d="M8 35c0-7 5.5-12 12-12s12 5 12 12" fill="#4B5563" />
    </svg>
  );
}

// ---- Avatar Presets (replacements for external URLs) ----

export function AvatarRobot({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1a1a2e" stroke="#00f3ff" strokeWidth="1" />
      <rect x="12" y="14" width="16" height="14" rx="3" fill="#00f3ff" fillOpacity="0.2" stroke="#00f3ff" strokeWidth="1" />
      <circle cx="16" cy="20" r="2" fill="#00f3ff" />
      <circle cx="24" cy="20" r="2" fill="#00f3ff" />
      <rect x="16" y="24" width="8" height="2" rx="1" fill="#00f3ff" fillOpacity="0.5" />
      <line x1="20" y1="8" x2="20" y2="14" stroke="#00f3ff" strokeWidth="1" />
      <circle cx="20" cy="7" r="2" fill="#00f3ff" fillOpacity="0.5" />
    </svg>
  );
}

export function AvatarAlien({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#0d1117" stroke="#39d353" strokeWidth="1" />
      <ellipse cx="20" cy="18" rx="10" ry="12" fill="#39d353" fillOpacity="0.15" />
      <ellipse cx="15" cy="16" rx="3" ry="4" fill="#39d353" fillOpacity="0.8" />
      <ellipse cx="25" cy="16" rx="3" ry="4" fill="#39d353" fillOpacity="0.8" />
      <circle cx="15" cy="16" r="1.5" fill="#0d1117" />
      <circle cx="25" cy="16" r="1.5" fill="#0d1117" />
      <path d="M16 25q4 3 8 0" stroke="#39d353" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function AvatarBear({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1a1a2e" stroke="#8B5CF6" strokeWidth="1" />
      <circle cx="12" cy="10" r="4" fill="#8B5CF6" fillOpacity="0.3" />
      <circle cx="28" cy="10" r="4" fill="#8B5CF6" fillOpacity="0.3" />
      <circle cx="20" cy="20" r="10" fill="#8B5CF6" fillOpacity="0.15" />
      <circle cx="16" cy="18" r="1.5" fill="#8B5CF6" />
      <circle cx="24" cy="18" r="1.5" fill="#8B5CF6" />
      <ellipse cx="20" cy="23" rx="3" ry="2" fill="#8B5CF6" fillOpacity="0.3" />
    </svg>
  );
}

export function AvatarLion({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1a1a2e" stroke="#F59E0B" strokeWidth="1" />
      <circle cx="20" cy="20" r="14" fill="#F59E0B" fillOpacity="0.1" />
      <circle cx="20" cy="20" r="9" fill="#F59E0B" fillOpacity="0.15" />
      <circle cx="16" cy="18" r="1.5" fill="#F59E0B" />
      <circle cx="24" cy="18" r="1.5" fill="#F59E0B" />
      <path d="M16 24q4 3 8 0" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
      <ellipse cx="20" cy="22" rx="2" ry="1.5" fill="#F59E0B" fillOpacity="0.3" />
    </svg>
  );
}

export function AvatarCrypto({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#0d1117" stroke="#F7931A" strokeWidth="1" />
      <circle cx="20" cy="20" r="10" fill="#F7931A" fillOpacity="0.1" stroke="#F7931A" strokeWidth="1" strokeOpacity="0.3" />
      <text x="20" y="25" textAnchor="middle" fill="#F7931A" fontSize="14" fontWeight="bold" fontFamily="monospace">&#x20BF;</text>
    </svg>
  );
}

export function AvatarTrader1({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1e293b" stroke="#3B82F6" strokeWidth="1" />
      <circle cx="20" cy="14" r="6" fill="#3B82F6" fillOpacity="0.3" />
      <path d="M10 34c0-6 4.5-10 10-10s10 4 10 10" fill="#3B82F6" fillOpacity="0.2" />
      <rect x="16" y="12" width="8" height="2" rx="1" fill="#3B82F6" fillOpacity="0.5" />
    </svg>
  );
}

export function AvatarTrader2({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1e293b" stroke="#EC4899" strokeWidth="1" />
      <circle cx="20" cy="14" r="6" fill="#EC4899" fillOpacity="0.3" />
      <path d="M10 34c0-6 4.5-10 10-10s10 4 10 10" fill="#EC4899" fillOpacity="0.2" />
    </svg>
  );
}

export function AvatarTrader3({ size = 40, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <circle cx="20" cy="20" r="19" fill="#1e293b" stroke="#10B981" strokeWidth="1" />
      <circle cx="20" cy="14" r="6" fill="#10B981" fillOpacity="0.3" />
      <path d="M10 34c0-6 4.5-10 10-10s10 4 10 10" fill="#10B981" fillOpacity="0.2" />
      <circle cx="26" cy="10" r="3" fill="#10B981" fillOpacity="0.2" />
    </svg>
  );
}

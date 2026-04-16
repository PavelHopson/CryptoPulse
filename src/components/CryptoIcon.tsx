import React, { useState } from 'react';
import {
  IconBTC, IconETH, IconBNB, IconSOL, IconXRP, IconADA, IconDOGE, IconDOT, IconAVAX, IconLINK,
  FlagEU, FlagUS, FlagJP, FlagRU, FlagCN, FlagGB,
  IconGold, IconOil, IconSP500, IconNasdaq,
  IconCryptoDefault, IconImageFallback,
} from '../assets/icons';

type IconComponent = React.FC<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  // Crypto
  bitcoin: IconBTC,
  ethereum: IconETH,
  binancecoin: IconBNB,
  solana: IconSOL,
  ripple: IconXRP,
  cardano: IconADA,
  dogecoin: IconDOGE,
  polkadot: IconDOT,
  'avalanche-2': IconAVAX,
  chainlink: IconLINK,
  // Forex
  'eur-usd': FlagEU,
  'usd-jpy': FlagJP,
  'usd-rub': FlagRU,
  'usd-cny': FlagCN,
  'gbp-usd': FlagGB,
  // Futures / Commodities
  'spx-500': IconSP500,
  'nasdaq-100': IconNasdaq,
  gold: IconGold,
  'oil-wti': IconOil,
};

interface CryptoIconProps {
  id: string;
  size?: number;
  fallbackUrl?: string;
  className?: string;
}

export function CryptoIcon({ id, size = 24, fallbackUrl, className = '' }: CryptoIconProps) {
  const [imgError, setImgError] = useState(false);

  const LocalIcon = ICON_MAP[id];
  if (LocalIcon) {
    return <LocalIcon size={size} className={className} />;
  }

  // For unknown coins: try external URL with fallback
  if (fallbackUrl && !imgError) {
    return (
      <img
        src={fallbackUrl}
        width={size}
        height={size}
        className={className}
        alt=""
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return <IconCryptoDefault size={size} className={className} />;
}

export { IconImageFallback };

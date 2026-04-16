import React, { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FEE_RATE = 0.0006; // 0.06% taker fee (typical exchange)

export const PositionCalculator: React.FC<Props> = ({ isOpen, onClose }) => {
  const [entryPrice, setEntryPrice] = useState<number>(60000);
  const [positionSize, setPositionSize] = useState<number>(1000);
  const [leverage, setLeverage] = useState<number>(10);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');

  const calculations = useMemo(() => {
    if (entryPrice <= 0 || positionSize <= 0 || leverage <= 0) {
      return null;
    }

    const margin = positionSize;
    const notional = margin * leverage;
    const quantity = notional / entryPrice;

    // Liquidation price (simplified, 100% margin loss)
    const maintenanceMarginRate = 0.005;
    const liquidationPrice =
      direction === 'LONG'
        ? entryPrice * (1 - (1 / leverage) + maintenanceMarginRate)
        : entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);

    // Fee costs (entry + exit)
    const totalFees = notional * FEE_RATE * 2;

    // Break-even price accounting for fees
    const feePerUnit = totalFees / quantity;
    const breakEvenPrice =
      direction === 'LONG'
        ? entryPrice + feePerUnit
        : entryPrice - feePerUnit;

    // PnL at various percentage moves
    const pnlAtPercent = (pct: number) => {
      const exitPrice = entryPrice * (1 + pct / 100);
      const rawPnl =
        direction === 'LONG'
          ? (exitPrice - entryPrice) * quantity
          : (entryPrice - exitPrice) * quantity;
      return rawPnl - totalFees;
    };

    const percentages = [25, 10, 5, -5, -10, -25];
    const pnlTable = percentages.map((pct) => ({
      percent: pct,
      pnl: pnlAtPercent(pct),
      roi: (pnlAtPercent(pct) / margin) * 100,
    }));

    return {
      notional,
      quantity,
      liquidationPrice,
      breakEvenPrice,
      totalFees,
      pnlTable,
    };
  }, [entryPrice, positionSize, leverage, direction]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-cyber-black border border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-cyber-cyan/5">
          <h2 className="font-display font-bold text-cyber-cyan tracking-widest text-sm">
            КАЛЬКУЛЯТОР ПОЗИЦИИ
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Direction toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setDirection('LONG')}
              className={`flex-1 py-2.5 font-mono text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                direction === 'LONG'
                  ? 'bg-cyber-green/15 border-cyber-green text-cyber-green shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> LONG
            </button>
            <button
              onClick={() => setDirection('SHORT')}
              className={`flex-1 py-2.5 font-mono text-sm font-bold flex items-center justify-center gap-2 border transition-all ${
                direction === 'SHORT'
                  ? 'bg-cyber-pink/15 border-cyber-pink text-cyber-pink shadow-[0_0_10px_rgba(255,0,128,0.2)]'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              <TrendingDown className="w-4 h-4" /> SHORT
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">
                Цена входа ($)
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-cyber-black border border-gray-700 px-4 py-2.5 font-mono text-white text-sm focus:border-cyber-cyan focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">
                Размер позиции ($)
              </label>
              <input
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(Number(e.target.value))}
                className="w-full bg-cyber-black border border-gray-700 px-4 py-2.5 font-mono text-white text-sm focus:border-cyber-cyan focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">
                Плечо: {leverage}x
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-cyber-cyan h-1 bg-gray-700 appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-gray-600 mt-1">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
              </div>
            </div>
          </div>

          {calculations && (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/60 border border-gray-800 p-3">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Ликвидация</div>
                  <div className="text-lg font-mono text-cyber-pink font-bold mt-1">
                    ${calculations.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 p-3">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Безубыток</div>
                  <div className="text-lg font-mono text-cyber-yellow font-bold mt-1">
                    ${calculations.breakEvenPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 p-3">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Объем</div>
                  <div className="text-lg font-mono text-white font-bold mt-1">
                    ${calculations.notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 p-3">
                  <div className="text-[10px] font-mono text-gray-500 uppercase">Комиссии</div>
                  <div className="text-lg font-mono text-gray-400 font-bold mt-1">
                    ${calculations.totalFees.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* PnL Table */}
              <div>
                <h3 className="text-[10px] font-mono text-cyber-cyan mb-2 tracking-widest uppercase">
                  Таблица PnL (с учетом комиссий)
                </h3>
                <div className="border border-gray-800 divide-y divide-gray-800">
                  <div className="grid grid-cols-3 px-4 py-2 bg-gray-900/60 text-[10px] font-mono text-gray-500 uppercase">
                    <span>Движение</span>
                    <span className="text-right">PnL ($)</span>
                    <span className="text-right">ROI (%)</span>
                  </div>
                  {calculations.pnlTable.map((row) => {
                    const isProfit = row.pnl >= 0;
                    return (
                      <div
                        key={row.percent}
                        className="grid grid-cols-3 px-4 py-2.5 font-mono text-sm hover:bg-cyber-cyan/5 transition-colors"
                      >
                        <span className={row.percent >= 0 ? 'text-cyber-green' : 'text-cyber-pink'}>
                          {row.percent > 0 ? '+' : ''}{row.percent}%
                        </span>
                        <span className={`text-right ${isProfit ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                          {isProfit ? '+' : ''}${row.pnl.toFixed(2)}
                        </span>
                        <span className={`text-right ${isProfit ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                          {isProfit ? '+' : ''}{row.roi.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

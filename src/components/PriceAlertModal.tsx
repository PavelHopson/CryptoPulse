import React, { useState, useEffect } from 'react';
import { X, Bell, BellRing, Trash2, CheckCircle, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { PriceAlert, createAlert, getAlerts, removeAlert } from '../services/alertService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  coinId?: string;
  coinName?: string;
  currentPrice?: number;
}

export const PriceAlertModal: React.FC<Props> = ({
  isOpen,
  onClose,
  coinId,
  coinName,
  currentPrice,
}) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newCoinId, setNewCoinId] = useState(coinId || '');
  const [newCoinName, setNewCoinName] = useState(coinName || '');
  const [targetPrice, setTargetPrice] = useState<number>(currentPrice || 0);
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  useEffect(() => {
    if (isOpen) {
      setAlerts(getAlerts());
      if (coinId) setNewCoinId(coinId);
      if (coinName) setNewCoinName(coinName);
      if (currentPrice) setTargetPrice(Math.round(currentPrice * 1.05 * 100) / 100);
    }
  }, [isOpen, coinId, coinName, currentPrice]);

  const handleCreate = () => {
    if (!newCoinId.trim() || !newCoinName.trim() || targetPrice <= 0) return;

    createAlert({
      coinId: newCoinId.trim(),
      coinName: newCoinName.trim(),
      targetPrice,
      direction,
    });

    setAlerts(getAlerts());
    if (!coinId) {
      setNewCoinId('');
      setNewCoinName('');
      setTargetPrice(0);
    }
  };

  const handleRemove = (id: string) => {
    removeAlert(id);
    setAlerts(getAlerts());
  };

  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-cyber-black border border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-cyber-cyan/5">
          <h2 className="font-display font-bold text-cyber-cyan tracking-widest text-sm flex items-center gap-2">
            <BellRing className="w-4 h-4" /> ЦЕНОВЫЕ АЛЕРТЫ
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add alert form */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Новый алерт
            </h3>

            {!coinId && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ID (bitcoin)"
                  value={newCoinId}
                  onChange={(e) => setNewCoinId(e.target.value)}
                  className="bg-cyber-black border border-gray-700 px-3 py-2 font-mono text-white text-xs focus:border-cyber-cyan focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Название"
                  value={newCoinName}
                  onChange={(e) => setNewCoinName(e.target.value)}
                  className="bg-cyber-black border border-gray-700 px-3 py-2 font-mono text-white text-xs focus:border-cyber-cyan focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Целевая цена"
                value={targetPrice || ''}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="flex-1 bg-cyber-black border border-gray-700 px-3 py-2 font-mono text-white text-xs focus:border-cyber-cyan focus:outline-none"
              />
              <button
                onClick={() => setDirection(direction === 'above' ? 'below' : 'above')}
                className={`px-3 py-2 border font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${
                  direction === 'above'
                    ? 'border-cyber-green text-cyber-green bg-cyber-green/10'
                    : 'border-cyber-pink text-cyber-pink bg-cyber-pink/10'
                }`}
              >
                {direction === 'above' ? (
                  <><TrendingUp className="w-3 h-3" /> ВЫШЕ</>
                ) : (
                  <><TrendingDown className="w-3 h-3" /> НИЖЕ</>
                )}
              </button>
            </div>

            <button
              onClick={handleCreate}
              className="w-full cyber-button py-2.5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-3 h-3" /> СОЗДАТЬ АЛЕРТ
            </button>
          </div>

          {/* Active alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono text-cyber-cyan mb-2 tracking-widest uppercase">
                Активные ({activeAlerts.length})
              </h3>
              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-gray-900/60 border border-gray-800 hover:border-cyber-cyan/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-cyber-yellow" />
                      <div>
                        <div className="font-mono text-xs text-white font-bold">
                          {alert.coinName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {alert.direction === 'above' ? '>' : '<'} $
                          {alert.targetPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(alert.id)}
                      className="text-gray-600 hover:text-cyber-pink transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono text-cyber-green mb-2 tracking-widest uppercase">
                Сработавшие ({triggeredAlerts.length})
              </h3>
              <div className="space-y-2">
                {triggeredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-cyber-green/5 border border-cyber-green/20"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-cyber-green" />
                      <div>
                        <div className="font-mono text-xs text-white font-bold">
                          {alert.coinName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {alert.direction === 'above' ? '>' : '<'} $
                          {alert.targetPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(alert.id)}
                      className="text-gray-600 hover:text-cyber-pink transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeAlerts.length === 0 && triggeredAlerts.length === 0 && (
            <div className="text-center py-8 border border-gray-800 border-dashed text-gray-600 font-mono text-xs">
              [ НЕТ АЛЕРТОВ ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'cryptopulse-price-alerts';

export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
}

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function readAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: PriceAlert[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function createAlert(
  alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>
): PriceAlert {
  const newAlert: PriceAlert = {
    ...alert,
    id: generateId(),
    createdAt: Date.now(),
    triggered: false,
  };
  const alerts = readAlerts();
  alerts.push(newAlert);
  writeAlerts(alerts);
  return newAlert;
}

export function getAlerts(): PriceAlert[] {
  return readAlerts();
}

export function removeAlert(id: string): void {
  const alerts = readAlerts().filter((a) => a.id !== id);
  writeAlerts(alerts);
}

export function checkAlerts(
  currentPrices: Record<string, number>
): PriceAlert[] {
  const alerts = readAlerts();
  const newlyTriggered: PriceAlert[] = [];

  const updated = alerts.map((alert) => {
    if (alert.triggered) return alert;

    const price = currentPrices[alert.coinId];
    if (price === undefined) return alert;

    const shouldTrigger =
      (alert.direction === 'above' && price >= alert.targetPrice) ||
      (alert.direction === 'below' && price <= alert.targetPrice);

    if (shouldTrigger) {
      const triggered = { ...alert, triggered: true };
      newlyTriggered.push(triggered);
      return triggered;
    }

    return alert;
  });

  writeAlerts(updated);
  return newlyTriggered;
}

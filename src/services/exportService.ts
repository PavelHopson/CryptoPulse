import { Position } from '../types';

export function exportTradesCSV(
  positions: Position[],
  currentPrices: Record<string, number>
) {
  if (positions.length === 0) {
    alert('Нет позиций для экспорта.');
    return;
  }

  const headers = [
    'Date',
    'Asset',
    'Type',
    'Entry Price',
    'Current Price',
    'Leverage',
    'PnL',
    'Status',
  ];

  const rows = positions.map((pos) => {
    const currentPrice = currentPrices[pos.assetId] || pos.entryPrice;
    const pnl =
      pos.type === 'LONG'
        ? (currentPrice - pos.entryPrice) * pos.amount
        : (pos.entryPrice - currentPrice) * pos.amount;

    return [
      new Date(pos.timestamp).toLocaleString('ru-RU'),
      `${pos.name} (${pos.symbol})`,
      pos.type,
      pos.entryPrice.toFixed(2),
      currentPrice.toFixed(2),
      `${pos.leverage}x`,
      pnl.toFixed(2),
      pnl >= 0 ? 'PROFIT' : 'LOSS',
    ];
  });

  // BOM for Excel UTF-8 compatibility
  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach((row) => {
    csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `cryptopulse-trades-${date}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

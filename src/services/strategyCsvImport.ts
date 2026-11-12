import type { PricePoint } from './strategyLab';

export interface StrategyCsvImportLimits {
  maxBytes: number;
  maxRows: number;
  maxColumns: number;
  maxCellLength: number;
}

export const DEFAULT_STRATEGY_CSV_LIMITS: Readonly<StrategyCsvImportLimits> = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxRows: 25_000,
  maxColumns: 8,
  maxCellLength: 240,
});

export class StrategyCsvImportError extends Error {
  readonly code:
    | 'EMPTY_FILE'
    | 'FILE_TOO_LARGE'
    | 'INVALID_CSV'
    | 'MISSING_COLUMNS'
    | 'TOO_MANY_COLUMNS'
    | 'TOO_MANY_ROWS'
    | 'INVALID_DATE'
    | 'INVALID_PRICE'
    | 'UNSORTED_DATES';

  constructor(code: StrategyCsvImportError['code'], message: string) {
    super(message);
    this.name = 'StrategyCsvImportError';
    this.code = code;
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function parseCsvRows(input: string, limits: StrategyCsvImportLimits): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;

  const pushCell = () => {
    if (cell.length > limits.maxCellLength) {
      throw new StrategyCsvImportError('INVALID_CSV', `Ячейка длиннее ${limits.maxCellLength} символов`);
    }
    row.push(cell.trim());
    cell = '';
    afterQuote = false;
  };
  const pushRow = () => {
    if (row.some((value) => value.length > 0)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (afterQuote && character !== ',' && character !== '\n' && character !== '\r' && character !== ' ' && character !== '\t') {
      throw new StrategyCsvImportError('INVALID_CSV', 'После закрывающей кавычки найден лишний текст');
    }
    if (character === '"' && cell.trim().length === 0) {
      cell = '';
      quoted = true;
      continue;
    }
    if (character === '"') {
      throw new StrategyCsvImportError('INVALID_CSV', 'Кавычка внутри неэкранированного поля');
    }
    if (character === ',') {
      pushCell();
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      pushCell();
      pushRow();
    } else {
      cell += character;
    }
  }

  if (quoted) throw new StrategyCsvImportError('INVALID_CSV', 'Файл заканчивается внутри кавычек');
  if (cell.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseDate(value: string, rowNumber: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new StrategyCsvImportError('INVALID_DATE', `Строка ${rowNumber}: дата должна быть в формате YYYY-MM-DD`);
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    throw new StrategyCsvImportError('INVALID_DATE', `Строка ${rowNumber}: несуществующая дата ${value}`);
  }
  return value.trim();
}

function parsePrice(value: string, rowNumber: number): number {
  const normalized = value.trim().replace(/\s/g, '');
  if (!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) {
    throw new StrategyCsvImportError('INVALID_PRICE', `Строка ${rowNumber}: цена должна быть положительным числом`);
  }
  const price = Number(normalized);
  if (!Number.isFinite(price) || price <= 0 || price > 1e15) {
    throw new StrategyCsvImportError('INVALID_PRICE', `Строка ${rowNumber}: цена вне допустимого диапазона`);
  }
  return price;
}

/** Parse a CSV with required date and close columns into sorted paper-trading prices. */
export function parseStrategyPricesCsv(
  input: string,
  limits: StrategyCsvImportLimits = DEFAULT_STRATEGY_CSV_LIMITS,
): PricePoint[] {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new StrategyCsvImportError('EMPTY_FILE', 'CSV-файл пустой');
  }
  if (byteLength(input) > limits.maxBytes) {
    throw new StrategyCsvImportError('FILE_TOO_LARGE', `CSV-файл больше ${Math.round(limits.maxBytes / 1024 / 1024)} МБ`);
  }

  const rows = parseCsvRows(input, limits);
  if (rows.length < 2) {
    throw new StrategyCsvImportError('MISSING_COLUMNS', 'Нужна строка заголовков и хотя бы одна цена');
  }
  if (rows.length - 1 > limits.maxRows) {
    throw new StrategyCsvImportError('TOO_MANY_ROWS', `В файле больше ${limits.maxRows} строк данных`);
  }

  const header = rows[0];
  if (header.length > limits.maxColumns) {
    throw new StrategyCsvImportError('TOO_MANY_COLUMNS', `В файле больше ${limits.maxColumns} колонок`);
  }
  const dateIndex = header.findIndex((value) => normalizeHeader(value) === 'date');
  const closeIndex = header.findIndex((value) => ['close', 'price', 'closingprice'].includes(normalizeHeader(value)));
  if (dateIndex < 0 || closeIndex < 0) {
    throw new StrategyCsvImportError('MISSING_COLUMNS', 'CSV должен содержать колонки date и close');
  }

  const points: PricePoint[] = [];
  let previousDate = '';
  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const row = rows[index];
    if (row.length > limits.maxColumns) {
      throw new StrategyCsvImportError('TOO_MANY_COLUMNS', `Строка ${rowNumber}: слишком много колонок`);
    }
    if (dateIndex >= row.length || closeIndex >= row.length || !row[dateIndex] || !row[closeIndex]) {
      throw new StrategyCsvImportError('INVALID_CSV', `Строка ${rowNumber}: отсутствует дата или цена`);
    }
    const date = parseDate(row[dateIndex], rowNumber);
    if (previousDate && date <= previousDate) {
      throw new StrategyCsvImportError('UNSORTED_DATES', `Строка ${rowNumber}: даты должны идти строго по возрастанию`);
    }
    previousDate = date;
    points.push({ date, close: parsePrice(row[closeIndex], rowNumber) });
  }
  return points;
}

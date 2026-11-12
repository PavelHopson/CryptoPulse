import { describe, expect, it } from 'vitest';
import { parseStrategyPricesCsv, StrategyCsvImportError } from './strategyCsvImport';

describe('Strategy CSV import', () => {
  it('parses date/close columns with optional extra fields and BOM', () => {
    const points = parseStrategyPricesCsv('\uFEFFdate,close,volume\n2026-01-01,100,12\n2026-01-02,101.5,13\n');
    expect(points).toEqual([
      { date: '2026-01-01', close: 100 },
      { date: '2026-01-02', close: 101.5 },
    ]);
  });

  it('supports quoted cells, CRLF and a price alias', () => {
    const points = parseStrategyPricesCsv('Date,Closing Price\r\n"2026-01-01", "1 200.50"\r\n"2026-01-02",1201\r\n');
    expect(points[0].close).toBe(1200.5);
    expect(points[1].date).toBe('2026-01-02');
  });

  it.each([
    ['date,close\n2026-02-30,100\n', 'INVALID_DATE'],
    ['date,close\n2026-01-01,-1\n', 'INVALID_PRICE'],
    ['date,close\n2026-01-02,100\n2026-01-01,101\n', 'UNSORTED_DATES'],
    ['time,value\n2026-01-01,100\n', 'MISSING_COLUMNS'],
    ['date,close,volume\n2026-01-01,100,1\n', 'TOO_MANY_COLUMNS'],
    ['date,close\n"2026-01-01,100\n', 'INVALID_CSV'],
  ])('rejects invalid input with code %s', (csv, code) => {
    try {
      parseStrategyPricesCsv(csv, { maxBytes: 1024, maxRows: 10, maxColumns: 2, maxCellLength: 240 });
      throw new Error('expected parser to reject input');
    } catch (error) {
      expect(error).toBeInstanceOf(StrategyCsvImportError);
      expect((error as StrategyCsvImportError).code).toBe(code);
    }
  });

  it('rejects an oversized cell with a clear CSV error', () => {
    expect(() => parseStrategyPricesCsv('date,close\n2026-01-01,100\n', {
      maxBytes: 1024,
      maxRows: 10,
      maxColumns: 2,
      maxCellLength: 3,
    })).toThrow('Ячейка длиннее');
  });

  it('enforces row and byte limits before returning data', () => {
    expect(() => parseStrategyPricesCsv('date,close\n2026-01-01,100\n', { maxBytes: 5, maxRows: 10, maxColumns: 8, maxCellLength: 240 })).toThrow('больше');
    expect(() => parseStrategyPricesCsv('date,close\n2026-01-01,100\n2026-01-02,101\n', { maxBytes: 1024, maxRows: 1, maxColumns: 8, maxCellLength: 240 })).toThrow('строк данных');
  });
});

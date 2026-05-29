import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  expandGrid,
  serializeCsv,
  detectDelimiter,
  parseWorkbook,
  serializeWorkbook,
} from '../csv';
// Direct import avoids vitest barrel-import caching quirk with re-exports
import { parseCsv } from '../csv/parse';

describe('createEmptyGrid', () => {
  it('creates default 20x10 grid', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(20);
    expect(grid[0].length).toBe(10);
    expect(grid[0][0]).toBe('');
  });

  it('creates grid with custom dimensions', () => {
    const grid = createEmptyGrid(5, 3);
    expect(grid.length).toBe(5);
    expect(grid[0].length).toBe(3);
  });
});

describe('expandGrid', () => {
  it('expands rows', () => {
    const grid = createEmptyGrid(2, 2);
    const expanded = expandGrid(grid, 4, 2);
    expect(expanded.length).toBe(4);
    expect(expanded[0].length).toBe(2);
  });

  it('expands columns', () => {
    const grid = createEmptyGrid(2, 2);
    const expanded = expandGrid(grid, 2, 4);
    expect(expanded.length).toBe(2);
    expect(expanded[0].length).toBe(4);
  });

  it('expands both rows and columns', () => {
    const grid = createEmptyGrid(2, 2);
    const expanded = expandGrid(grid, 5, 5);
    expect(expanded.length).toBe(5);
    expect(expanded[0].length).toBe(5);
  });

  it('does not shrink grid', () => {
    const grid = createEmptyGrid(5, 5);
    const expanded = expandGrid(grid, 3, 3);
    expect(expanded.length).toBe(5);
    expect(expanded[0].length).toBe(5);
  });
});

describe('parseCsv', () => {
  it('preserves blank rows in the middle of data', () => {
    const result = parseCsv('a,b,c\n\n1,2,3');
    expect(result.data.length).toBe(3);
    expect(result.data[0]).toEqual(['a', 'b', 'c']);
    expect(result.data[1]).toEqual(['', '', '']);
    expect(result.data[2]).toEqual(['1', '2', '3']);
  });

  it('trims trailing empty rows', () => {
    const result = parseCsv('a,b,c\n1,2,3\n\n');
    expect(result.data.length).toBe(2);
  });

  it('handles quoted fields with commas', () => {
    const result = parseCsv('"San Francisco, CA",USA\nAustin,TX');
    expect(result.data[0][0]).toBe('San Francisco, CA');
    expect(result.data[0][1]).toBe('USA');
  });

  it('handles escaped quotes', () => {
    const result = parseCsv('"She said ""hello""",world');
    expect(result.data[0][0]).toBe('She said "hello"');
    expect(result.data[0][1]).toBe('world');
  });

  it('handles newlines inside quoted cells', () => {
    const result = parseCsv('"Line 1\nLine 2",col2');
    expect(result.data[0][0]).toBe('Line 1\nLine 2');
    expect(result.data[0][1]).toBe('col2');
  });

  it('handles empty input', () => {
    const result = parseCsv('');
    expect(result.data.length).toBe(20);
    expect(result.data[0].length).toBe(10);
  });

  it('strips UTF-8 BOM from start of file', () => {
    const result = parseCsv('\uFEFFName,Age\nAlice,30');
    expect(result.data[0][0]).toBe('Name');
    expect(result.data[0][1]).toBe('Age');
    expect(result.data[1][0]).toBe('Alice');
  });
});

describe('serializeCsv', () => {
  it('round-trips basic data', () => {
    const input = 'a,b,c\n1,2,3';
    const parsed = parseCsv(input);
    const output = serializeCsv(parsed.data);
    expect(output).toBe(input);
  });

  it('quotes cells with commas', () => {
    const data = [['San Francisco, CA', 'USA']];
    const output = serializeCsv(data);
    expect(output).toBe('"San Francisco, CA",USA');
  });

  it('escapes quotes in cells', () => {
    const data = [['She said "hello"', 'world']];
    const output = serializeCsv(data);
    expect(output).toBe('"She said ""hello""",world');
  });

  it('round-trips CSV with quoted fields', () => {
    const input = '"a,b",c\n"d",e';
    const parsed = parseCsv(input);
    const output = serializeCsv(parsed.data);
    // Only cells needing quoting (containing delimiter, quotes, or newlines) are quoted on output
    expect(output).toBe('"a,b",c\nd,e');
  });

  it('round-trips CSV with newlines in cells', () => {
    const input = '"Line 1\nLine 2",col2';
    const parsed = parseCsv(input);
    const output = serializeCsv(parsed.data);
    expect(output).toBe(input);
  });

  it('round-trips TSV data', () => {
    const input = 'a\tb\tc\n1\t2\t3';
    const parsed = parseCsv(input);
    const output = serializeCsv(parsed.data);
    expect(output).toBe('a,b,c\n1,2,3');
  });

  it('round-trips semicolon-delimited data', () => {
    const input = 'a;b;c\n1;2;3';
    const parsed = parseCsv(input);
    const output = serializeCsv(parsed.data);
    expect(output).toBe('a,b,c\n1,2,3');
  });

  it('normalizes ragged rows', () => {
    const input = 'a,b,c\n1,2';
    const parsed = parseCsv(input);
    expect(parsed.data[1].length).toBe(3);
    expect(parsed.data[1][2]).toBe('');
  });
});

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });
});

describe('parseWorkbook', () => {
  it('parses plain CSV as single-tab workbook', () => {
    const result = parseWorkbook('a,b,c\n1,2,3');
    expect(result.tabs.length).toBe(1);
    expect(result.tabs[0].name).toBe('Sheet1');
    expect(result.tabs[0].data[0]).toEqual(['a', 'b', 'c']);
  });

  it('parses workbook format with multiple tabs', () => {
    const content =
      '#HOLYSHEET_TABS_V1\n#TAB:Sheet1\n#FORMAT:%7B%7D\n#WIDTHS:%5B%5D\na,b\n1,2\n#TAB:Sheet2\n#FORMAT:%7B%7D\n#WIDTHS:%5B%5D\nx,y\n3,4';
    const result = parseWorkbook(content);
    expect(result.tabs.length).toBe(2);
    expect(result.tabs[0].name).toBe('Sheet1');
    expect(result.tabs[1].name).toBe('Sheet2');
  });
});

describe('serializeWorkbook', () => {
  it('serializes single tab without formatting as plain CSV', () => {
    const tabs = [{ id: '1', name: 'Sheet1', data: [['a', 'b'], ['1', '2']], formats: {}, columnWidths: [] }];
    const output = serializeWorkbook(tabs);
    expect(output).toBe('a,b\n1,2');
  });

  it('serializes multi-tab workbook with header', () => {
    const tabs = [
      { id: '1', name: 'Sheet1', data: [['a']], formats: { '0:0': { bold: true } }, columnWidths: [] },
      { id: '2', name: 'Sheet2', data: [['x']], formats: {}, columnWidths: [] },
    ] as Parameters<typeof serializeWorkbook>[0];
    const output = serializeWorkbook(tabs);
    expect(output).toContain('#HOLYSHEET_TABS_V1');
    expect(output).toContain('#TAB:Sheet1');
    expect(output).toContain('#TAB:Sheet2');
  });

  it('round-trips workbook format', () => {
    const tabs = [
      { id: '1', name: 'Data', data: [['Name', 'Age'], ['Alice', '30']], formats: {}, columnWidths: [100, 80] },
    ];
    const serialized = serializeWorkbook(tabs);
    const parsed = parseWorkbook(serialized);
    expect(parsed.tabs.length).toBe(1);
    expect(parsed.tabs[0].name).toBe('Data');
    expect(parsed.tabs[0].data[1][0]).toBe('Alice');
    expect(parsed.tabs[0].columnWidths).toEqual([100, 80]);
  });
});

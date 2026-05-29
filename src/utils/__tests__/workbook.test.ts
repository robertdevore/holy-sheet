/**
 * Workbook format round-trip tests (HS-014).
 *
 * Verifies that the #HOLYSHEET_TABS_V1 workbook format
 * serializes and deserializes correctly with tabs, formatting,
 * column widths, and special characters.
 */

import { describe, it, expect } from 'vitest';
import { parseWorkbook, serializeWorkbook } from '../csv/workbook';

const roundTripWorkbook = (input: string): string => {
  const parsed = parseWorkbook(input);
  return serializeWorkbook(parsed.tabs);
};

describe('Workbook round-trip (HS-014)', () => {
  it('single tab, no formatting → plain CSV output (no workbook header)', () => {
    const input = 'a,b,c\n1,2,3';
    const output = roundTripWorkbook(input);
    expect(output).toBe(input);
    expect(output).not.toContain('#HOLYSHEET_TABS_V1');
  });

  it('single tab, with formatting → workbook format with header', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Sheet1',
        data: [
          ['a', 'b'],
          ['1', '2'],
        ],
        formats: { '0:0': { bold: true } },
        columnWidths: [],
      },
    ];
    const output = serializeWorkbook(tabs);
    expect(output).toContain('#HOLYSHEET_TABS_V1');
    expect(output).toContain('#TAB:Sheet1');
    expect(output).toContain('#FORMAT:');
    expect(output).toContain('a,b');
  });

  it('multi-tab → workbook format with multiple #TAB: sections', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Data',
        data: [['x', 'y'], ['1', '2']],
        formats: {},
        columnWidths: [],
      },
      {
        id: 'sheet-2',
        name: 'Notes',
        data: [['note'], ['hello']],
        formats: {},
        columnWidths: [],
      },
    ];
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs.length).toBe(2);
    expect(parsed.tabs[0].name).toBe('Data');
    expect(parsed.tabs[1].name).toBe('Notes');
    expect(parsed.tabs[0].data[0]).toEqual(['x', 'y']);
    expect(parsed.tabs[1].data[1]).toEqual(['hello']);
  });

  it('column widths serialize and deserialize correctly', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Sheet1',
        data: [['a', 'b', 'c']],
        formats: {},
        columnWidths: [200, 150, 100],
      },
    ];
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs[0].columnWidths).toEqual([200, 150, 100]);
  });

  it('cell formats (bold, italic, underline, colors) serialize and deserialize', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Sheet1',
        data: [['hello', 'world']],
        formats: {
          '0:0': { bold: true, italic: false },
          '0:1': { underline: true, textColor: '#ff0000', backgroundColor: '#00ff00' },
        },
        columnWidths: [],
      },
    ];
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs[0].formats?.['0:0']).toEqual({ bold: true, italic: false });
    expect(parsed.tabs[0].formats?.['0:1']).toEqual({
      underline: true,
      textColor: '#ff0000',
      backgroundColor: '#00ff00',
    });
  });

  it('tab names with special characters round-trip via URI encoding', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Sales Data (2026)',
        data: [['a']],
        formats: {},
        columnWidths: [],
      },
      {
        id: 'sheet-2',
        name: 'Résumé & CV',
        data: [['b']],
        formats: {},
        columnWidths: [],
      },
    ];
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs[0].name).toBe('Sales Data (2026)');
    expect(parsed.tabs[1].name).toBe('Résumé & CV');
  });

  it('minimal data round-trips via workbook format (with column widths to force header)', () => {
    const tabs = [
      {
        id: 'sheet-1',
        name: 'Minimal',
        data: [['hello']],
        formats: {},
        columnWidths: [100],
      },
    ];
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs[0].name).toBe('Minimal');
    expect(parsed.tabs[0].data[0]).toEqual(['hello']);
  });

  it('tab names with spaces and hyphens round-trip via workbook format', () => {
    // Single tab without formatting/widths serializes as plain CSV (no header).
    // Use 2 tabs to force workbook format so the tab name is preserved.
    const tabs = [
      {
        id: 'sheet-1',
        name: 'my-sheet name',
        data: [['x']],
        formats: {},
        columnWidths: [],
      },
      {
        id: 'sheet-2',
        name: 'other tab',
        data: [['y']],
        formats: {},
        columnWidths: [],
      },
    ];
    const output = serializeWorkbook(tabs);
    expect(output).toContain('#HOLYSHEET_TABS_V1');
    const parsed = parseWorkbook(output);
    expect(parsed.tabs[0].name).toBe('my-sheet name');
    expect(parsed.tabs[1].name).toBe('other tab');
  });

  it('workbook with many tabs serializes and parses correctly', () => {
    const tabs = Array.from({ length: 5 }, (_, i) => ({
      id: `sheet-${i + 1}`,
      name: `Tab${i + 1}`,
      data: [[`cell-${i}`]],
      formats: {} as Record<string, { bold?: boolean; italic?: boolean; underline?: boolean; textColor?: string; backgroundColor?: string }>,
      columnWidths: [] as number[],
    }));
    const output = serializeWorkbook(tabs);
    const parsed = parseWorkbook(output);
    expect(parsed.tabs.length).toBe(5);
    expect(parsed.tabs.map((t) => t.name)).toEqual([
      'Tab1', 'Tab2', 'Tab3', 'Tab4', 'Tab5',
    ]);
  });
});

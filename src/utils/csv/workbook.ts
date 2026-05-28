/**
 * HolySheet multi-tab workbook format parsing and serialization.
 */

import type { WorkbookTab, WorkbookData, CellFormatData } from './types';
import { parseCsv } from './parse';
import { serializeCsv } from './serialize';
import { createEmptyGrid } from './grid';

const WORKBOOK_HEADER = '#HOLYSHEET_TABS_V1';
const WORKBOOK_TAB_PREFIX = '#TAB:';
const WORKBOOK_FORMAT_PREFIX = '#FORMAT:';
const WORKBOOK_WIDTHS_PREFIX = '#WIDTHS:';

/**
 * Parse HolySheet workbook format or fallback to a single CSV tab.
 */
export function parseWorkbook(content: string): WorkbookData {
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (
    !normalizedContent.startsWith(WORKBOOK_HEADER + '\n') &&
    normalizedContent !== WORKBOOK_HEADER
  ) {
    return {
      tabs: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          data: parseCsv(content).data,
          formats: {},
          columnWidths: [],
        },
      ],
    };
  }

  const lines = normalizedContent.split('\n');
  const tabs: WorkbookTab[] = [];
  let currentTabName: string | null = null;
  let currentTabFormats: Record<string, CellFormatData> = {};
  let currentTabColumnWidths: number[] = [];
  let currentTabLines: string[] = [];

  const flushCurrentTab = () => {
    if (null === currentTabName) return;

    const tabContent = currentTabLines.join('\n');
    const parsed = parseCsv(tabContent);
    tabs.push({
      id: `sheet-${tabs.length + 1}`,
      name: currentTabName,
      data: parsed.data,
      formats: currentTabFormats,
      columnWidths: currentTabColumnWidths,
    });
    currentTabLines = [];
    currentTabFormats = {};
    currentTabColumnWidths = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] || '';

    if (line.startsWith(WORKBOOK_TAB_PREFIX)) {
      flushCurrentTab();
      const encodedName = line.substring(WORKBOOK_TAB_PREFIX.length);
      try {
        currentTabName = decodeURIComponent(encodedName) || `Sheet${tabs.length + 1}`;
      } catch {
        currentTabName = encodedName || `Sheet${tabs.length + 1}`;
      }
      continue;
    }

    if (line.startsWith(WORKBOOK_FORMAT_PREFIX)) {
      const encodedFormats = line.substring(WORKBOOK_FORMAT_PREFIX.length);

      if (!encodedFormats) {
        currentTabFormats = {};
        continue;
      }

      try {
        const decoded = decodeURIComponent(encodedFormats);
        const parsedFormats = JSON.parse(decoded) as Record<string, CellFormatData>;
        currentTabFormats = parsedFormats && 'object' === typeof parsedFormats ? parsedFormats : {};
      } catch {
        currentTabFormats = {};
      }

      continue;
    }

    if (line.startsWith(WORKBOOK_WIDTHS_PREFIX)) {
      const encodedWidths = line.substring(WORKBOOK_WIDTHS_PREFIX.length);

      if (!encodedWidths) {
        currentTabColumnWidths = [];
        continue;
      }

      try {
        const decoded = decodeURIComponent(encodedWidths);
        const parsedWidths = JSON.parse(decoded);

        if (Array.isArray(parsedWidths)) {
          currentTabColumnWidths = parsedWidths.map((width) => {
            const numeric_width = Number(width);
            return Number.isFinite(numeric_width) && numeric_width > 0 ? numeric_width : 0;
          });
        } else {
          currentTabColumnWidths = [];
        }
      } catch {
        currentTabColumnWidths = [];
      }

      continue;
    }

    if (null !== currentTabName) {
      currentTabLines.push(line);
    }
  }

  flushCurrentTab();

  if (!tabs.length) {
    return {
      tabs: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          data: createEmptyGrid(),
          formats: {},
          columnWidths: [],
        },
      ],
    };
  }

  return { tabs };
}

/**
 * Serialize workbook tabs into HolySheet multi-tab CSV format.
 */
export function serializeWorkbook(tabs: WorkbookTab[]): string {
  const safeTabs = tabs.length
    ? tabs
    : [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          data: createEmptyGrid(),
          formats: {},
          columnWidths: [],
        },
      ];
  const hasAnyFormatting = safeTabs.some(
    (tab) => !!tab.formats && Object.keys(tab.formats).length > 0,
  );
  const hasAnyColumnWidths = safeTabs.some(
    (tab) => !!tab.columnWidths && tab.columnWidths.length > 0,
  );

  if (1 === safeTabs.length && !hasAnyFormatting && !hasAnyColumnWidths) {
    return serializeCsv(safeTabs[0].data);
  }

  const lines: string[] = [WORKBOOK_HEADER];

  for (const tab of safeTabs) {
    const encodedName = encodeURIComponent(tab.name || 'Sheet');
    lines.push(`${WORKBOOK_TAB_PREFIX}${encodedName}`);

    const formats = tab.formats || {};
    const encodedFormats = encodeURIComponent(JSON.stringify(formats));
    lines.push(`${WORKBOOK_FORMAT_PREFIX}${encodedFormats}`);

    const columnWidths = tab.columnWidths || [];
    const encodedWidths = encodeURIComponent(JSON.stringify(columnWidths));
    lines.push(`${WORKBOOK_WIDTHS_PREFIX}${encodedWidths}`);

    lines.push(serializeCsv(tab.data));
  }

  return lines.join('\n');
}

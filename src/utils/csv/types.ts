/**
 * Shared types for CSV parsing, serialization, and workbook format.
 */

export interface CsvData {
  data: string[][];
  rowCount: number;
  colCount: number;
}

export interface CellFormatData {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

export interface WorkbookTab {
  id: string;
  name: string;
  data: string[][];
  formats?: Record<string, CellFormatData>;
  columnWidths?: number[];
}

export interface WorkbookData {
  tabs: WorkbookTab[];
}

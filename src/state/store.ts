import { useState, useCallback } from 'react';
import { createEmptyGrid, expandGrid } from '../utils/csv';
import { CellCoord, CellRange, getRangeBounds } from '../utils/selection';
import {
  UndoStack,
  createCellEditCommand,
  createPasteCommand,
  createInsertRowCommand,
  createDeleteRowCommand,
  createInsertColumnCommand,
  createDeleteColumnCommand,
  createMoveRowCommand,
  createMoveColumnCommand,
} from './undo';

interface SheetTab {
  id: string;
  name: string;
  data: string[][];
  formats: CellFormatMap;
  columnWidths: number[];
}

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

type CellFormatType = keyof CellFormat;
type CellColorType = 'textColor' | 'backgroundColor';
type CellFormatMap = Record<string, CellFormat>;

function getFormatKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function createSheetId(): string {
  return `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSheetTab(name: string = 'Sheet1', data?: string[][], formats?: CellFormatMap, columnWidths?: number[]): SheetTab {
  return {
    id: createSheetId(),
    name,
    data: data || createEmptyGrid(),
    formats: formats || {},
    columnWidths: columnWidths || [],
  };
}

function getActiveTab(tabs: SheetTab[], activeTabId: string): SheetTab {
  return tabs.find((tab) => tab.id === activeTabId) || tabs[0];
}

export interface AppState {
  tabs: SheetTab[];
  activeTabId: string;
  data: string[][];
  cellFormats: CellFormatMap;
  columnWidths: number[];
  selectedCell: CellCoord | null;
  selectedRange: CellRange | null;
  editingCell: CellCoord | null;
  filePath: string | null;
  fileName: string | null;
  isDirty: boolean;
}

const undoStack = new UndoStack();

export function useAppState() {
  const initialTab = createSheetTab('Sheet1');

  const [state, setState] = useState<AppState>({
    tabs: [initialTab],
    activeTabId: initialTab.id,
    data: initialTab.data,
    cellFormats: initialTab.formats,
    columnWidths: initialTab.columnWidths,
    selectedCell: null,
    selectedRange: null,
    editingCell: null,
    filePath: null,
    fileName: null,
    isDirty: false,
  });

  const updateData = useCallback((newData: string[][]) => {
    setState((prev: AppState) => ({
      ...prev,
      tabs: prev.tabs.map((tab) => (
        tab.id === prev.activeTabId ? { ...tab, data: newData } : tab
      )),
      data: newData,
      isDirty: true,
    }));
  }, []);

  const setData = useCallback((newData: string[][], filePath?: string, fileName?: string) => {
    undoStack.clear();
    const firstTab = createSheetTab('Sheet1', newData);
    setState((prev: AppState) => ({
      ...prev,
      tabs: [firstTab],
      activeTabId: firstTab.id,
      data: firstTab.data,
      cellFormats: firstTab.formats,
      columnWidths: firstTab.columnWidths,
      filePath: filePath || prev.filePath,
      fileName: fileName || prev.fileName,
      selectedCell: null,
      selectedRange: null,
      editingCell: null,
      isDirty: false,
    }));
  }, []);

  const setWorkbook = useCallback((newTabs: Array<{ name: string; data: string[][]; formats?: CellFormatMap; columnWidths?: number[] }>, filePath?: string, fileName?: string) => {
    undoStack.clear();

    const tabs = (newTabs.length ? newTabs : [{ name: 'Sheet1', data: createEmptyGrid() }]).map((tab, index) =>
      createSheetTab(tab.name || `Sheet${index + 1}`, tab.data, tab.formats, tab.columnWidths)
    );
    const activeTab = tabs[0];

    setState((prev: AppState) => ({
      ...prev,
      tabs,
      activeTabId: activeTab.id,
      data: activeTab.data,
      cellFormats: activeTab.formats,
      columnWidths: activeTab.columnWidths,
      filePath: filePath || prev.filePath,
      fileName: fileName || prev.fileName,
      selectedCell: null,
      selectedRange: null,
      editingCell: null,
      isDirty: false,
    }));
  }, []);

  const setCellValue = useCallback(
    (row: number, col: number, value: string) => {
      const oldValue = state.data[row]?.[col] || '';
      if (oldValue === value) return;

      const command = createCellEditCommand(state.data, row, col, value, oldValue, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const pasteData = useCallback(
    (startRow: number, startCol: number, pastedData: string[][]) => {
      // Expand grid if needed
      const neededRows = startRow + pastedData.length;
      const neededCols = startCol + (pastedData[0]?.length || 0);
      const currentRows = state.data.length;
      const currentCols = state.data[0]?.length || 0;

      let newData = state.data;
      if (neededRows > currentRows || neededCols > currentCols) {
        newData = expandGrid(
          state.data,
          Math.max(neededRows, currentRows),
          Math.max(neededCols, currentCols)
        );
      }

      const command = createPasteCommand(newData, startRow, startCol, pastedData, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const insertRow = useCallback(
    (rowIndex: number) => {
      const command = createInsertRowCommand(state.data, rowIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const deleteRow = useCallback(
    (rowIndex: number) => {
      if (state.data.length <= 1) return; // Keep at least one row
      const command = createDeleteRowCommand(state.data, rowIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const insertColumn = useCallback(
    (colIndex: number) => {
      const command = createInsertColumnCommand(state.data, colIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const deleteColumn = useCallback(
    (colIndex: number) => {
      if (state.data[0]?.length <= 1) return; // Keep at least one column
      const command = createDeleteColumnCommand(state.data, colIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const moveRow = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.data.length || toIndex >= state.data.length) return;

      const command = createMoveRowCommand(state.data, fromIndex, toIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const moveColumn = useCallback(
    (fromIndex: number, toIndex: number) => {
      const colCount = state.data[0]?.length || 0;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= colCount || toIndex >= colCount) return;

      const command = createMoveColumnCommand(state.data, fromIndex, toIndex, updateData);
      undoStack.execute(command);
    },
    [state.data, updateData]
  );

  const undo = useCallback(() => {
    undoStack.undo();
  }, []);

  const redo = useCallback(() => {
    undoStack.redo();
  }, []);

  const canUndo = useCallback(() => undoStack.canUndo(), []);
  const canRedo = useCallback(() => undoStack.canRedo(), []);

  const setSelectedCell = useCallback((cell: CellCoord | null) => {
    setState((prev: AppState) => ({
      ...prev,
      selectedCell: cell,
      selectedRange: cell ? { start: cell, end: cell } : null,
    }));
  }, []);

  const setSelectedRange = useCallback((range: CellRange | null) => {
    setState((prev: AppState) => ({
      ...prev,
      selectedRange: range,
      selectedCell: range?.start || null,
    }));
  }, []);

  const setEditingCell = useCallback((cell: CellCoord | null) => {
    setState((prev: AppState) => ({
      ...prev,
      editingCell: cell,
    }));
  }, []);

  const newFile = useCallback(() => {
    undoStack.clear();
    const freshTab = createSheetTab('Sheet1');

    setState({
      tabs: [freshTab],
      activeTabId: freshTab.id,
      data: freshTab.data,
      cellFormats: freshTab.formats,
      columnWidths: freshTab.columnWidths,
      selectedCell: null,
      selectedRange: null,
      editingCell: null,
      filePath: null,
      fileName: null,
      isDirty: false,
    });
  }, []);

  const markSaved = useCallback((filePath?: string, fileName?: string) => {
    setState((prev: AppState) => ({
      ...prev,
      filePath: filePath || prev.filePath,
      fileName: fileName || prev.fileName,
      isDirty: false,
    }));
  }, []);

  const addTab = useCallback(() => {
    undoStack.clear();

    setState((prev: AppState) => {
      const newTabName = `Sheet${prev.tabs.length + 1}`;
      const newTab = createSheetTab(newTabName);

      return {
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: newTab.id,
        data: newTab.data,
        cellFormats: newTab.formats,
        columnWidths: newTab.columnWidths,
        selectedCell: null,
        selectedRange: null,
        editingCell: null,
        isDirty: true,
      };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    undoStack.clear();

    setState((prev: AppState) => {
      if (tabId === prev.activeTabId) return prev;

      const activeTab = getActiveTab(prev.tabs, tabId);
      if (!activeTab) return prev;

      return {
        ...prev,
        activeTabId: activeTab.id,
        data: activeTab.data,
        cellFormats: activeTab.formats,
        columnWidths: activeTab.columnWidths,
        selectedCell: null,
        selectedRange: null,
        editingCell: null,
      };
    });
  }, []);

  const toggleFormat = useCallback((range: CellRange | null, formatType: CellFormatType) => {
    if (!range) return;

    const bounds = getRangeBounds(range);

    setState((prev: AppState) => {
      const nextFormats: CellFormatMap = { ...prev.cellFormats };

      let allFormatted = true;
      for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          const key = getFormatKey(row, col);
          if (!nextFormats[key]?.[formatType]) {
            allFormatted = false;
            break;
          }
        }
        if (!allFormatted) break;
      }

      const nextValue = !allFormatted;

      for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          const key = getFormatKey(row, col);
          const current = nextFormats[key] || {};
          const updated = {
            ...current,
            [formatType]: nextValue,
          };

          if (!updated.bold && !updated.italic && !updated.underline && !updated.textColor && !updated.backgroundColor) {
            delete nextFormats[key];
          } else {
            nextFormats[key] = updated;
          }
        }
      }

      return {
        ...prev,
        tabs: prev.tabs.map((tab) => (
          tab.id === prev.activeTabId ? { ...tab, formats: nextFormats } : tab
        )),
        cellFormats: nextFormats,
        isDirty: true,
      };
    });
  }, []);

  const setFormatColor = useCallback((range: CellRange | null, colorType: CellColorType, colorValue: string) => {
    if (!range) return;

    const bounds = getRangeBounds(range);
    const normalizedColor = colorValue.trim();

    setState((prev: AppState) => {
      const nextFormats: CellFormatMap = { ...prev.cellFormats };

      for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          const key = getFormatKey(row, col);
          const current = nextFormats[key] || {};
          const updated = {
            ...current,
            [colorType]: normalizedColor || undefined,
          };

          if (!updated.bold && !updated.italic && !updated.underline && !updated.textColor && !updated.backgroundColor) {
            delete nextFormats[key];
          } else {
            nextFormats[key] = updated;
          }
        }
      }

      return {
        ...prev,
        tabs: prev.tabs.map((tab) => (
          tab.id === prev.activeTabId ? { ...tab, formats: nextFormats } : tab
        )),
        cellFormats: nextFormats,
        isDirty: true,
      };
    });
  }, []);

  const renameTab = useCallback((tabId: string, tabName: string) => {
    const trimmedName = tabName.trim();
    const nextName = trimmedName || 'Sheet';

    setState((prev: AppState) => {
      const existingTab = prev.tabs.find((tab) => tab.id === tabId);
      if (!existingTab || existingTab.name === nextName) return prev;

      return {
        ...prev,
        tabs: prev.tabs.map((tab) => (
          tab.id === tabId ? { ...tab, name: nextName } : tab
        )),
        isDirty: true,
      };
    });
  }, []);

  const setColumnWidths = useCallback((columnWidths: number[]) => {
    setState((prev: AppState) => {
      const nextColumnWidths = (columnWidths || []).map((width) => {
        const numeric_width = Number(width);
        return Number.isFinite(numeric_width) && numeric_width > 0 ? numeric_width : 0;
      });

      if (JSON.stringify(prev.columnWidths) === JSON.stringify(nextColumnWidths)) return prev;

      return {
        ...prev,
        tabs: prev.tabs.map((tab) => (
          tab.id === prev.activeTabId ? { ...tab, columnWidths: nextColumnWidths } : tab
        )),
        columnWidths: nextColumnWidths,
        isDirty: true,
      };
    });
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    undoStack.clear();

    setState((prev: AppState) => {
      if (prev.tabs.length <= 1) return prev;

      const tabIndex = prev.tabs.findIndex((tab) => tab.id === tabId);
      if (-1 === tabIndex) return prev;

      const nextTabs = prev.tabs.filter((tab) => tab.id !== tabId);
      const shouldSwitchActive = prev.activeTabId === tabId;
      const nextActiveTab = shouldSwitchActive
        ? nextTabs[Math.max(0, tabIndex - 1)] || nextTabs[0]
        : getActiveTab(nextTabs, prev.activeTabId);

      return {
        ...prev,
        tabs: nextTabs,
        activeTabId: nextActiveTab.id,
        data: nextActiveTab.data,
        selectedCell: shouldSwitchActive ? null : prev.selectedCell,
        selectedRange: shouldSwitchActive ? null : prev.selectedRange,
        editingCell: shouldSwitchActive ? null : prev.editingCell,
        columnWidths: nextActiveTab.columnWidths,
        isDirty: true,
      };
    });
  }, []);

  return {
    state,
    setData,
    setWorkbook,
    setCellValue,
    pasteData,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    moveRow,
    moveColumn,
    undo,
    redo,
    canUndo,
    canRedo,
    setSelectedCell,
    setSelectedRange,
    setEditingCell,
    newFile,
    markSaved,
    addTab,
    switchTab,
    renameTab,
    deleteTab,
    toggleFormat,
    setFormatColor,
    setColumnWidths,
  };
}

import { useState, useCallback } from 'react';
import { createEmptyGrid, expandGrid } from '../utils/csv';
import { CellCoord, CellRange } from '../utils/selection';
import {
  UndoStack,
  createCellEditCommand,
  createPasteCommand,
  createInsertRowCommand,
  createDeleteRowCommand,
  createInsertColumnCommand,
  createDeleteColumnCommand,
} from './undo';

export interface AppState {
  data: string[][];
  selectedCell: CellCoord | null;
  selectedRange: CellRange | null;
  editingCell: CellCoord | null;
  filePath: string | null;
  fileName: string | null;
  isDirty: boolean;
}

const undoStack = new UndoStack();

export function useAppState() {
  const [state, setState] = useState<AppState>({
    data: createEmptyGrid(),
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
      data: newData,
      isDirty: true,
    }));
  }, []);

  const setData = useCallback((newData: string[][], filePath?: string, fileName?: string) => {
    setState((prev: AppState) => ({
      ...prev,
      data: newData,
      filePath: filePath || prev.filePath,
      fileName: fileName || prev.fileName,
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
    setState({
      data: createEmptyGrid(),
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

  return {
    state,
    setData,
    setCellValue,
    pasteData,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    undo,
    redo,
    canUndo,
    canRedo,
    setSelectedCell,
    setSelectedRange,
    setEditingCell,
    newFile,
    markSaved,
  };
}

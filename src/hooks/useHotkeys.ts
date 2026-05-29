import { useEffect, useRef } from 'react';
import type { CellCoord, CellRange } from '../utils/selection';
import { a1ToCoord } from '../utils/selection';

interface UseHotkeysParams {
  /** Ref to current grid data (avoids effect re-registration on every keystroke) */
  dataRef: React.MutableRefObject<string[][]>;
  /** Ref to current selected cell */
  selectedCellRef: React.MutableRefObject<CellCoord | null>;
  /** Ref to pending copy format ('tsv' or 'csv') — set before execCommand('copy') */
  pendingCopyFormatRef: React.MutableRefObject<'tsv' | 'csv'>;
  /** Callback: start editing a cell */
  setEditingCell: (cell: CellCoord | null) => void;
  /** Callback: set selected cell */
  setSelectedCell: (cell: CellCoord | null) => void;
  /** Callback: set selected range */
  setSelectedRange: (range: CellRange | null) => void;
  /** Callback: toggle formatting bar visibility */
  setShowFormattingBar: React.Dispatch<React.SetStateAction<boolean>>;
  /** Get selected range as text (TSV or CSV) */
  getSelectedRangeText: (format?: 'tsv' | 'csv') => string | null;
  /** Clear values in selected range */
  clearSelectedRangeValues: () => void;
  /** Fill selection down */
  fillSelectionDown: () => void;
  /** Fill selection right */
  fillSelectionRight: () => void;
  /** Toggle bold/italic/underline */
  toggleSelectionFormat: (formatType: 'bold' | 'italic' | 'underline') => void;
  /** Set text or background color */
  setSelectionColor: (colorType: 'textColor' | 'backgroundColor') => void;
  /** Insert row/column from selection */
  insertFromSelection: () => void;
  /** Delete row/column from selection */
  deleteFromSelection: () => void;
  /** Undo */
  undo: () => void;
  /** Redo */
  redo: () => void;
  /** Paste from clipboard */
  runPasteFromClipboard: () => Promise<void>;
}

/**
 * Global keyboard shortcut handler for Holy Sheet.
 *
 * All rapidly-changing state values are accessed via refs to avoid
 * re-registering the event listener on every keystroke.
 */
export function useHotkeys({
  dataRef,
  selectedCellRef,
  pendingCopyFormatRef,
  setEditingCell,
  setSelectedCell,
  setSelectedRange,
  setShowFormattingBar,
  getSelectedRangeText,
  clearSelectedRangeValues,
  fillSelectionDown,
  fillSelectionRight,
  toggleSelectionFormat,
  setSelectionColor,
  insertFromSelection,
  deleteFromSelection,
  undo,
  redo,
  runPasteFromClipboard,
}: UseHotkeysParams): void {
  // Stable callback refs to avoid stale closures in the event listener
  const callbacksRef = useRef({
    setEditingCell,
    setSelectedCell,
    setSelectedRange,
    setShowFormattingBar,
    getSelectedRangeText,
    clearSelectedRangeValues,
    fillSelectionDown,
    fillSelectionRight,
    toggleSelectionFormat,
    setSelectionColor,
    insertFromSelection,
    deleteFromSelection,
    undo,
    redo,
    runPasteFromClipboard,
  });

  // Keep callback refs current without re-registering the effect
  useEffect(() => {
    callbacksRef.current = {
      setEditingCell,
      setSelectedCell,
      setSelectedRange,
      setShowFormattingBar,
      getSelectedRangeText,
      clearSelectedRangeValues,
      fillSelectionDown,
      fillSelectionRight,
      toggleSelectionFormat,
      setSelectionColor,
      insertFromSelection,
      deleteFromSelection,
      undo,
      redo,
      runPasteFromClipboard,
    };
  });

  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ('INPUT' === target.tagName ||
          'TEXTAREA' === target.tagName ||
          target.isContentEditable)
      ) {
        return;
      }

      const cbs = callbacksRef.current;
      const selectedCell = selectedCellRef.current;

      // F2: Edit active cell
      if ('f2' === e.key.toLowerCase()) {
        if (!selectedCell) return;
        e.preventDefault();
        cbs.setEditingCell({ row: selectedCell.row, col: selectedCell.col });
        return;
      }

      // Escape: Cancel editing / clear selection
      if ('escape' === e.key.toLowerCase()) {
        e.preventDefault();
        cbs.setEditingCell(null);
        if (selectedCell) {
          cbs.setSelectedCell({ row: selectedCell.row, col: selectedCell.col });
        } else {
          cbs.setSelectedRange(null);
        }
        return;
      }

      // Ctrl+Space: Select entire column
      if (' ' === e.key && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        if (!selectedCell) return;
        const data = dataRef.current;
        const rowCount = data.length;
        cbs.setEditingCell(null);
        cbs.setSelectedRange({
          start: { row: 0, col: selectedCell.col },
          end: { row: rowCount - 1, col: selectedCell.col },
        });
        return;
      }

      // Shift+Space: Select entire row
      if (' ' === e.key && e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!selectedCell) return;
        const data = dataRef.current;
        const colCount = data[0]?.length || 0;
        cbs.setEditingCell(null);
        cbs.setSelectedRange({
          start: { row: selectedCell.row, col: 0 },
          end: { row: selectedCell.row, col: colCount - 1 },
        });
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();

      // Ctrl+Shift+F: Toggle formatting bar
      if ('f' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.setShowFormattingBar((prev) => !prev);
        return;
      }

      // Ctrl+G: Go to cell
      if ('g' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const input = window.prompt('Go to cell (e.g. A1):', 'A1');
        if (!input) return;

        const coord = a1ToCoord(input.trim().toUpperCase());
        if (!coord) return;

        const data = dataRef.current;
        const rowCount = data.length;
        const colCount = data[0]?.length || 0;
        if (coord.row < 0 || coord.col < 0 || coord.row >= rowCount || coord.col >= colCount) {
          return;
        }

        cbs.setEditingCell(null);
        cbs.setSelectedCell({ row: coord.row, col: coord.col });
        return;
      }

      // Ctrl+A: Select all
      if ('a' === key && !e.shiftKey) {
        e.preventDefault();
        const data = dataRef.current;
        const rowCount = data.length;
        const colCount = data[0]?.length || 0;
        if (rowCount <= 0 || colCount <= 0) return;

        cbs.setEditingCell(null);
        cbs.setSelectedRange({
          start: { row: 0, col: 0 },
          end: { row: rowCount - 1, col: colCount - 1 },
        });
        return;
      }

      // Ctrl+Shift+A: Clear selection to active cell
      if ('a' === key && e.shiftKey) {
        e.preventDefault();
        if (selectedCell) {
          cbs.setSelectedCell({ row: selectedCell.row, col: selectedCell.col });
        } else {
          cbs.setSelectedRange(null);
        }
        cbs.setEditingCell(null);
        return;
      }

      // Ctrl+C: Copy as TSV — sets format flag then triggers DOM copy event.
      if ('c' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        pendingCopyFormatRef.current = 'tsv';
        document.execCommand('copy');
        return;
      }

      // Ctrl+Shift+C: Copy as CSV — sets format flag then triggers DOM copy event.
      if ('c' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        pendingCopyFormatRef.current = 'csv';
        document.execCommand('copy');
        return;
      }

      // Ctrl+X: Cut
      if ('x' === key && !e.shiftKey && !e.altKey) {
        const text = cbs.getSelectedRangeText();
        if (null === text) return;

        e.preventDefault();
        document.execCommand('copy');
        cbs.clearSelectedRangeValues();
        return;
      }

      // Ctrl+V: Paste
      if ('v' === key && !e.altKey) {
        e.preventDefault();
        cbs.runPasteFromClipboard();
        return;
      }

      // Ctrl+D: Fill down
      if ('d' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.fillSelectionDown();
        return;
      }

      // Ctrl+B: Bold
      if ('b' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.toggleSelectionFormat('bold');
        return;
      }

      // Ctrl+I: Italic
      if ('i' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.toggleSelectionFormat('italic');
        return;
      }

      // Ctrl+U: Underline
      if ('u' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.toggleSelectionFormat('underline');
        return;
      }

      // Ctrl+Shift+H: Background color
      if ('h' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.setSelectionColor('backgroundColor');
        return;
      }

      // Ctrl+Shift+T: Text color
      if ('t' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.setSelectionColor('textColor');
        return;
      }

      // Ctrl+R: Fill right
      if ('r' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        cbs.fillSelectionRight();
        return;
      }

      // Ctrl+Plus/=: Insert
      if ('+' === key || '=' === key) {
        e.preventDefault();
        cbs.insertFromSelection();
        return;
      }

      // Ctrl+Minus/_: Delete
      if ('-' === key || '_' === key) {
        e.preventDefault();
        cbs.deleteFromSelection();
        return;
      }

      // Ctrl+Z: Undo
      if ('z' === key && !e.shiftKey) {
        e.preventDefault();
        cbs.undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if (('z' === key && e.shiftKey) || 'y' === key) {
        e.preventDefault();
        cbs.redo();
      }
    };

    window.addEventListener('keydown', handleHotkeys, true);
    return () => window.removeEventListener('keydown', handleHotkeys, true);
    // Effect only registers once — all dynamic values accessed via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

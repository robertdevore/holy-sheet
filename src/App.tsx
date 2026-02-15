import React, { useEffect, useState, useCallback } from 'react';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useAppState } from './state/store';
import { parseCsv, serializeCsv } from './utils/csv';
import { CellRange, getRangeBounds, a1ToCoord } from './utils/selection';
import './App.css';

function App() {
  const isMac = navigator.platform.toUpperCase().includes('MAC');

  const {
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
  } = useAppState();

  const [portableInfo, setPortableInfo] = useState<{
    isPortable: boolean;
    portablePath: string;
    isDev: boolean;
  } | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.0');

  const [contextMenu, setContextMenu] = useState<{
    type: 'row' | 'col';
    index: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    // Get portable mode info
    window.electronAPI.getPortableInfo().then(setPortableInfo);
    window.electronAPI.getAppVersion().then(setAppVersion).catch(() => {});

    // Setup menu listeners
    const cleanupNew = window.electronAPI.onMenuNew(() => handleNew());
    const cleanupOpen = window.electronAPI.onMenuOpen(() => handleOpen());
    const cleanupSave = window.electronAPI.onMenuSave(() => handleSave());
    const cleanupSaveAs = window.electronAPI.onMenuSaveAs(() => handleSaveAs());
    const cleanupUndo = window.electronAPI.onMenuUndo(() => undo());
    const cleanupRedo = window.electronAPI.onMenuRedo(() => redo());

    return () => {
      cleanupNew();
      cleanupOpen();
      cleanupSave();
      cleanupSaveAs();
      cleanupUndo();
      cleanupRedo();
    };
  }, []);

  const checkUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!state.isDirty) return true;

    const result = await window.electronAPI.confirmUnsavedChanges();
    if (result === 'cancel') return false;
    if (result === 'save') {
      await handleSave();
    }
    return true;
  }, [state.isDirty]);

  const handleNew = useCallback(async () => {
    const canProceed = await checkUnsavedChanges();
    if (canProceed) {
      newFile();
    }
  }, [checkUnsavedChanges, newFile]);

  const handleOpen = useCallback(async () => {
    const canProceed = await checkUnsavedChanges();
    if (!canProceed) return;

    const result = await window.electronAPI.openCsv();
    if (result) {
      const parsed = parseCsv(result.content);
      setData(parsed.data, result.path, result.name);
    }
  }, [checkUnsavedChanges, setData]);

  const handleSave = useCallback(async () => {
    if (!state.filePath) {
      return handleSaveAs();
    }

    const csvContent = serializeCsv(state.data);
    const result = await window.electronAPI.saveCsv(state.filePath, csvContent);

    if (result.success) {
      markSaved();
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  }, [state.filePath, state.data, markSaved]);

  const handleSaveAs = useCallback(async () => {
    const csvContent = serializeCsv(state.data);
    const result = await window.electronAPI.saveCsvAs(csvContent);

    if (result && result.success) {
      markSaved(result.path, result.name);
    }
  }, [state.data, markSaved]);

  const handlePanicClose = useCallback(() => {
    window.electronAPI.panicClose();
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      setSelectedCell({ row, col });
      setEditingCell(null);
    },
    [setSelectedCell, setEditingCell]
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      setEditingCell({ row, col });
    },
    [setEditingCell]
  );

  const handleCellEdit = useCallback(
    (row: number, col: number, value: string) => {
      setCellValue(row, col, value);
    },
    [setCellValue]
  );

  const handleEditComplete = useCallback(() => {
    setEditingCell(null);
  }, [setEditingCell]);

  const handleEditCancel = useCallback(() => {
    setEditingCell(null);
  }, [setEditingCell]);

  const handleRangeSelect = useCallback(
    (range: CellRange) => {
      setSelectedRange(range);
    },
    [setSelectedRange]
  );

  const handleRowHeaderClick = useCallback((row: number) => {
    const col_count = state.data[0]?.length || 0;
    if (col_count <= 0) return;

    setEditingCell(null);
    setSelectedRange({
      start: { row, col: 0 },
      end: { row, col: col_count - 1 },
    });
  }, [state.data, setEditingCell, setSelectedRange]);

  const handleColHeaderClick = useCallback((col: number) => {
    const row_count = state.data.length;
    if (row_count <= 0) return;

    setEditingCell(null);
    setSelectedRange({
      start: { row: 0, col },
      end: { row: row_count - 1, col },
    });
  }, [state.data, setEditingCell, setSelectedRange]);

  const handleRowHeaderContextMenu = useCallback((row: number, event: React.MouseEvent) => {
    setContextMenu({
      type: 'row',
      index: row,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleColHeaderContextMenu = useCallback((col: number, event: React.MouseEvent) => {
    setContextMenu({
      type: 'col',
      index: col,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const getSelectedRangeText = useCallback((format: 'tsv' | 'csv' = 'tsv'): string | null => {
    if (!state.selectedRange) return null;

    const bounds = getRangeBounds(state.selectedRange);
    const selection_data: string[][] = [];

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const cells: string[] = [];
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        cells.push(state.data[r]?.[c] || '');
      }
      selection_data.push(cells);
    }

    if ('csv' === format) {
      return serializeCsv(selection_data, ',');
    }

    return selection_data.map((row) => row.join('\t')).join('\n');
  }, [state.selectedRange, state.data]);

  const pasteTextAtSelection = useCallback((text: string) => {
    if (!state.selectedCell || state.editingCell || !text) return;

    const rows = text.split('\n').map((row) => {
      if (row.includes('\t')) {
        return row.split('\t');
      }
      return row.split(',');
    });

    pasteData(state.selectedCell.row, state.selectedCell.col, rows);
  }, [state.selectedCell, state.editingCell, pasteData]);

  const clearSelectedRangeValues = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    const clear_rows: string[][] = [];

    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      const cells: string[] = [];
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        cells.push('');
      }
      clear_rows.push(cells);
    }

    pasteData(bounds.minRow, bounds.minCol, clear_rows);
  }, [state.selectedRange, pasteData]);

  const fillSelectionDown = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    if (bounds.maxRow === bounds.minRow) return;

    const fill_rows: string[][] = [];
    const first_row_values: string[] = [];

    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      first_row_values.push(state.data[bounds.minRow]?.[col] || '');
    }

    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      fill_rows.push(first_row_values.slice());
    }

    pasteData(bounds.minRow, bounds.minCol, fill_rows);
  }, [state.selectedRange, state.data, pasteData]);

  const fillSelectionRight = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    if (bounds.maxCol === bounds.minCol) return;

    const fill_rows: string[][] = [];

    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      const left_value = state.data[row]?.[bounds.minCol] || '';
      const values: string[] = [];
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        values.push(left_value);
      }
      fill_rows.push(values);
    }

    pasteData(bounds.minRow, bounds.minCol, fill_rows);
  }, [state.selectedRange, state.data, pasteData]);

  const insertFromSelection = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    const row_count = state.data.length;
    const col_count = state.data[0]?.length || 0;
    const is_full_row_selection = bounds.minCol === 0 && bounds.maxCol === Math.max(0, col_count - 1);
    const is_full_col_selection = bounds.minRow === 0 && bounds.maxRow === Math.max(0, row_count - 1);

    if (is_full_row_selection) {
      insertRow(bounds.maxRow + 1);
      return;
    }

    if (is_full_col_selection) {
      insertColumn(bounds.maxCol + 1);
    }
  }, [state.selectedRange, state.data, insertRow, insertColumn]);

  const deleteFromSelection = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    const row_count = state.data.length;
    const col_count = state.data[0]?.length || 0;
    const is_full_row_selection = bounds.minCol === 0 && bounds.maxCol === Math.max(0, col_count - 1);
    const is_full_col_selection = bounds.minRow === 0 && bounds.maxRow === Math.max(0, row_count - 1);

    if (is_full_row_selection) {
      for (let row = bounds.maxRow; row >= bounds.minRow; row--) {
        deleteRow(row);
      }
      return;
    }

    if (is_full_col_selection) {
      for (let col = bounds.maxCol; col >= bounds.minCol; col--) {
        deleteColumn(col);
      }
    }
  }, [state.selectedRange, state.data, deleteRow, deleteColumn]);

  const runPasteFromClipboard = useCallback(async () => {
    if (!state.selectedCell || state.editingCell) return;

    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          pasteTextAtSelection(text);
        }
      } catch (error) {
      }
    }
  }, [state.selectedCell, state.editingCell, pasteTextAtSelection]);

  // Handle copy/paste
  useEffect(() => {
    const handleCopy = async (e: ClipboardEvent) => {
      const text = getSelectedRangeText();
      if (null === text) return;

      e.preventDefault();
      e.clipboardData?.setData('text/plain', text);
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (!state.selectedCell || state.editingCell) return;

      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      pasteTextAtSelection(text);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [state.selectedCell, state.editingCell, getSelectedRangeText, pasteTextAtSelection]);

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (
        'INPUT' === target.tagName ||
        'TEXTAREA' === target.tagName ||
        target.isContentEditable
      )) {
        return;
      }

      if ('f2' === e.key.toLowerCase()) {
        if (!state.selectedCell) return;
        e.preventDefault();
        setEditingCell({ row: state.selectedCell.row, col: state.selectedCell.col });
        return;
      }

      if ('escape' === e.key.toLowerCase()) {
        e.preventDefault();
        setEditingCell(null);
        if (state.selectedCell) {
          setSelectedCell({ row: state.selectedCell.row, col: state.selectedCell.col });
        } else {
          setSelectedRange(null);
        }
        return;
      }

      const is_modifier_pressed = e.metaKey || e.ctrlKey;
      if (!is_modifier_pressed) return;

      const key = e.key.toLowerCase();

      if ('g' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const input = window.prompt('Go to cell (e.g. A1):', 'A1');
        if (!input) return;

        const coord = a1ToCoord(input.trim().toUpperCase());
        if (!coord) return;

        const row_count = state.data.length;
        const col_count = state.data[0]?.length || 0;
        if (coord.row < 0 || coord.col < 0 || coord.row >= row_count || coord.col >= col_count) {
          return;
        }

        setEditingCell(null);
        setSelectedCell({ row: coord.row, col: coord.col });
        return;
      }

      if ('a' === key && !e.shiftKey) {
        e.preventDefault();

        const row_count = state.data.length;
        const col_count = state.data[0]?.length || 0;
        if (row_count <= 0 || col_count <= 0) return;

        setEditingCell(null);
        setSelectedRange({
          start: { row: 0, col: 0 },
          end: { row: row_count - 1, col: col_count - 1 },
        });
        return;
      }

      if ('a' === key && e.shiftKey) {
        e.preventDefault();
        if (state.selectedCell) {
          setSelectedCell({ row: state.selectedCell.row, col: state.selectedCell.col });
        } else {
          setSelectedRange(null);
        }
        setEditingCell(null);
        return;
      }

      if ('c' === key && !e.shiftKey && !e.altKey) {
        const text = getSelectedRangeText();
        if (null === text) return;

        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {
            document.execCommand('copy');
          });
        } else {
          document.execCommand('copy');
        }
        return;
      }

      if ('c' === key && e.shiftKey && !e.altKey) {
        const text = getSelectedRangeText('csv');
        if (null === text) return;

        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {
            document.execCommand('copy');
          });
        } else {
          document.execCommand('copy');
        }
        return;
      }

      if ('x' === key && !e.shiftKey && !e.altKey) {
        const text = getSelectedRangeText();
        if (null === text) return;

        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {
            document.execCommand('copy');
          });
        } else {
          document.execCommand('copy');
        }

        clearSelectedRangeValues();
        return;
      }

      if ('v' === key && !e.altKey) {
        e.preventDefault();
        runPasteFromClipboard();
        return;
      }

      if ('d' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        fillSelectionDown();
        return;
      }

      if ('r' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        fillSelectionRight();
        return;
      }

      if ('+' === key || '=' === key) {
        e.preventDefault();
        insertFromSelection();
        return;
      }

      if ('-' === key || '_' === key) {
        e.preventDefault();
        deleteFromSelection();
        return;
      }

      if ('z' === key && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (('z' === key && e.shiftKey) || 'y' === key) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleHotkeys, true);
    return () => window.removeEventListener('keydown', handleHotkeys, true);
  }, [
    undo,
    redo,
    state.data,
    state.selectedCell,
    setEditingCell,
    setSelectedCell,
    setSelectedRange,
    getSelectedRangeText,
    clearSelectedRangeValues,
    fillSelectionDown,
    fillSelectionRight,
    insertFromSelection,
    deleteFromSelection,
    runPasteFromClipboard,
  ]);

  return (
    <div className={`app ${isMac ? 'is-macos' : ''}`}>
      <Toolbar
        appVersion={appVersion}
        fileName={state.fileName}
        isDirty={state.isDirty}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onUndo={undo}
        onRedo={redo}
        onPanicClose={handlePanicClose}
      />

      <div className="app-body">
        <Grid
          data={state.data}
          selectedCell={state.selectedCell}
          selectedRange={state.selectedRange}
          editingCell={state.editingCell}
          onCellClick={handleCellClick}
          onCellDoubleClick={handleCellDoubleClick}
          onCellEdit={handleCellEdit}
          onEditComplete={handleEditComplete}
          onEditCancel={handleEditCancel}
          onRangeSelect={handleRangeSelect}
          onRowHeaderClick={handleRowHeaderClick}
          onColHeaderClick={handleColHeaderClick}
          onRowHeaderContextMenu={handleRowHeaderContextMenu}
          onColHeaderContextMenu={handleColHeaderContextMenu}
        />
      </div>

      <StatusBar
        selectedCell={state.selectedCell}
        selectedRange={state.selectedRange}
        rowCount={state.data.length}
        colCount={state.data[0]?.length || 0}
        isPortable={portableInfo?.isPortable || false}
      />

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {contextMenu.type === 'row' ? (
            <>
              <div
                className="context-menu-item"
                onClick={() => {
                  insertRow(contextMenu.index);
                  setContextMenu(null);
                }}
              >
                Insert Row Above
              </div>
              <div
                className="context-menu-item"
                onClick={() => {
                  insertRow(contextMenu.index + 1);
                  setContextMenu(null);
                }}
              >
                Insert Row Below
              </div>
              <div
                className="context-menu-item"
                onClick={() => {
                  deleteRow(contextMenu.index);
                  setContextMenu(null);
                }}
              >
                Delete Row
              </div>
            </>
          ) : (
            <>
              <div
                className="context-menu-item"
                onClick={() => {
                  insertColumn(contextMenu.index);
                  setContextMenu(null);
                }}
              >
                Insert Column Left
              </div>
              <div
                className="context-menu-item"
                onClick={() => {
                  insertColumn(contextMenu.index + 1);
                  setContextMenu(null);
                }}
              >
                Insert Column Right
              </div>
              <div
                className="context-menu-item"
                onClick={() => {
                  deleteColumn(contextMenu.index);
                  setContextMenu(null);
                }}
              >
                Delete Column
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

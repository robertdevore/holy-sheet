import React, { useEffect, useState, useCallback } from 'react';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useAppState } from './state/store';
import { parseCsv, serializeCsv } from './utils/csv';
import { CellRange } from './utils/selection';
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

  // Handle copy/paste
  useEffect(() => {
    const handleCopy = async (e: ClipboardEvent) => {
      if (!state.selectedRange) return;

      e.preventDefault();
      const bounds = {
        minRow: Math.min(state.selectedRange.start.row, state.selectedRange.end.row),
        maxRow: Math.max(state.selectedRange.start.row, state.selectedRange.end.row),
        minCol: Math.min(state.selectedRange.start.col, state.selectedRange.end.col),
        maxCol: Math.max(state.selectedRange.start.col, state.selectedRange.end.col),
      };

      const rows: string[] = [];
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        const cells: string[] = [];
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          cells.push(state.data[r]?.[c] || '');
        }
        rows.push(cells.join('\t'));
      }

      const text = rows.join('\n');
      e.clipboardData?.setData('text/plain', text);
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (!state.selectedCell || state.editingCell) return;

      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      // Parse TSV/CSV
      const rows = text.split('\n').map((row) => {
        // Try tab first, then comma
        if (row.includes('\t')) {
          return row.split('\t');
        }
        return row.split(',');
      });

      pasteData(state.selectedCell.row, state.selectedCell.col, rows);
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [state.selectedRange, state.selectedCell, state.data, state.editingCell, pasteData]);

  // Close context menu on click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Global undo/redo hotkeys
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

      const is_modifier_pressed = e.metaKey || e.ctrlKey;
      if (!is_modifier_pressed) return;

      const key = e.key.toLowerCase();

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
  }, [undo, redo]);

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

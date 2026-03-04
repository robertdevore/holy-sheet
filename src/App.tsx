import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useAppState } from './state/store';
import { parseWorkbook, serializeWorkbook, serializeCsv } from './utils/csv';
import { CellRange, getRangeBounds, a1ToCoord } from './utils/selection';
import './App.css';

function App() {
  const isMac = navigator.platform.toUpperCase().includes('MAC');

  const {
    state,
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
  } = useAppState();

  const [portableInfo, setPortableInfo] = useState<{
    isPortable: boolean;
    portablePath: string;
    isDev: boolean;
  } | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [textColorPicker, setTextColorPicker] = useState('#1f2937');
  const [backgroundColorPicker, setBackgroundColorPicker] = useState('#fef3c7');
  const [showFormattingBar, setShowFormattingBar] = useState(true);

  const [contextMenu, setContextMenu] = useState<{
    type: 'row' | 'col';
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const handleNewRef = useRef<() => Promise<void> | void>(async () => {});
  const handleOpenRef = useRef<() => Promise<void> | void>(async () => {});
  const handleSaveRef = useRef<() => Promise<void> | void>(async () => {});
  const handleSaveAsRef = useRef<() => Promise<void> | void>(async () => {});

  useEffect(() => {
    // Get portable mode info
    window.electronAPI.getPortableInfo().then(setPortableInfo);
    window.electronAPI.getAppVersion().then(setAppVersion).catch(() => {});

    // Setup menu listeners
    const cleanupNew = window.electronAPI.onMenuNew(() => { void handleNewRef.current(); });
    const cleanupOpen = window.electronAPI.onMenuOpen(() => { void handleOpenRef.current(); });
    const cleanupSave = window.electronAPI.onMenuSave(() => { void handleSaveRef.current(); });
    const cleanupSaveAs = window.electronAPI.onMenuSaveAs(() => { void handleSaveAsRef.current(); });
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
      const parsed = parseWorkbook(result.content);
      const workbookTabs = parsed.tabs.map((tab) => ({
        name: tab.name,
        data: tab.data,
        formats: tab.formats,
        columnWidths: tab.columnWidths,
      }));
      setWorkbook(workbookTabs, result.path, result.name);
    }
  }, [checkUnsavedChanges, setWorkbook]);

  const handleSave = useCallback(async () => {
    if (!state.filePath) {
      return handleSaveAs();
    }

    const csvContent = serializeWorkbook(state.tabs);
    const result = await window.electronAPI.saveCsv(state.filePath, csvContent);

    if (result.success) {
      markSaved();
    } else {
      alert(`Failed to save: ${result.error}`);
    }
  }, [state.filePath, state.tabs, markSaved]);

  const handleSaveAs = useCallback(async () => {
    const csvContent = serializeWorkbook(state.tabs);
    const result = await window.electronAPI.saveCsvAs(csvContent);

    if (result && result.success) {
      markSaved(result.path, result.name);
    }
  }, [state.tabs, markSaved]);

  const handlePanicClose = useCallback(() => {
    window.electronAPI.panicClose();
  }, []);

  useEffect(() => {
    handleNewRef.current = handleNew;
    handleOpenRef.current = handleOpen;
    handleSaveRef.current = handleSave;
    handleSaveAsRef.current = handleSaveAs;
  }, [handleNew, handleOpen, handleSave, handleSaveAs]);

  const startTabRename = useCallback((tabId: string, tabName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(tabName);
  }, []);

  const cancelTabRename = useCallback(() => {
    setEditingTabId(null);
    setEditingTabName('');
  }, []);

  const commitTabRename = useCallback((tabId: string) => {
    renameTab(tabId, editingTabName);
    setEditingTabId(null);
    setEditingTabName('');
  }, [renameTab, editingTabName]);

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

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const hasStructuredData = normalized.includes('\n') || normalized.includes('\t');

    let rows: string[][];
    if (!hasStructuredData) {
      rows = [[normalized]];
    } else {
      rows = normalized.split('\n').map((row) => {
        if (row.includes('\t')) {
          return row.split('\t');
        }
        return row.split(',');
      });

      while (rows.length > 1 && rows[rows.length - 1].every((cell) => '' === cell)) {
        rows.pop();
      }
    }

    if (!rows.length) return;

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

  const toggleSelectionFormat = useCallback((formatType: 'bold' | 'italic' | 'underline') => {
    if (!state.selectedRange) return;
    toggleFormat(state.selectedRange, formatType);
  }, [state.selectedRange, toggleFormat]);

  const setSelectionColor = useCallback((colorType: 'textColor' | 'backgroundColor') => {
    if (!state.selectedRange) return;
    const value = 'textColor' === colorType ? textColorPicker : backgroundColorPicker;
    setFormatColor(state.selectedRange, colorType, value);
  }, [state.selectedRange, setFormatColor, textColorPicker, backgroundColorPicker]);

  const clearSelectionColor = useCallback((colorType: 'textColor' | 'backgroundColor') => {
    if (!state.selectedRange) return;
    setFormatColor(state.selectedRange, colorType, '');
  }, [state.selectedRange, setFormatColor]);

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

      if ('f' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        setShowFormattingBar((prev: boolean) => !prev);
        return;
      }

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

      if ('b' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleSelectionFormat('bold');
        return;
      }

      if ('i' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleSelectionFormat('italic');
        return;
      }

      if ('u' === key && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleSelectionFormat('underline');
        return;
      }

      if ('h' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        setSelectionColor('backgroundColor');
        return;
      }

      if ('t' === key && e.shiftKey && !e.altKey) {
        e.preventDefault();
        setSelectionColor('textColor');
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
    toggleSelectionFormat,
    setSelectionColor,
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
        showFormattingBar={showFormattingBar}
        hasSelection={!!state.selectedRange}
        textColor={textColorPicker}
        backgroundColor={backgroundColorPicker}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onUndo={undo}
        onRedo={redo}
        onToggleBold={() => toggleSelectionFormat('bold')}
        onToggleItalic={() => toggleSelectionFormat('italic')}
        onToggleUnderline={() => toggleSelectionFormat('underline')}
        onTextColorChange={(color: string) => {
          setTextColorPicker(color);
          if (state.selectedRange) {
            setFormatColor(state.selectedRange, 'textColor', color);
          }
        }}
        onBackgroundColorChange={(color: string) => {
          setBackgroundColorPicker(color);
          if (state.selectedRange) {
            setFormatColor(state.selectedRange, 'backgroundColor', color);
          }
        }}
        onClearTextColor={() => clearSelectionColor('textColor')}
        onClearBackgroundColor={() => clearSelectionColor('backgroundColor')}
        onPanicClose={handlePanicClose}
      />

      <div className="app-body">
        <Grid
          data={state.data}
          cellFormats={state.cellFormats}
          columnWidths={state.columnWidths}
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
          onInsertRow={insertRow}
          onRowMove={moveRow}
          onColMove={moveColumn}
          onColumnWidthsChange={setColumnWidths}
          onOpenExternalUrl={(url: string) => {
            window.electronAPI.openExternalUrl(url);
          }}
        />
      </div>

      <div className="tab-strip" role="tablist" aria-label="Workbook tabs">
        {state.tabs.map((tab) => {
          const isActive = tab.id === state.activeTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div key={tab.id} className={`tab-item ${isActive ? 'active' : ''}`}>
              {isEditing ? (
                <input
                  className="tab-name-input"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => commitTabRename(tab.id)}
                  onKeyDown={(e) => {
                    if ('Enter' === e.key) {
                      e.preventDefault();
                      commitTabRename(tab.id);
                    }

                    if ('Escape' === e.key) {
                      e.preventDefault();
                      cancelTabRename();
                    }
                  }}
                  autoFocus
                />
              ) : (
                <button
                  className="tab-button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchTab(tab.id)}
                  onDoubleClick={() => startTabRename(tab.id, tab.name)}
                  title={`${tab.name} (double-click to rename)`}
                >
                  {tab.name}
                </button>
              )}

              <button
                className="tab-close-button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTab(tab.id);
                }}
                title="Delete tab"
                aria-label={`Delete ${tab.name} tab`}
                disabled={state.tabs.length <= 1}
              >
                ×
              </button>
            </div>
          );
        })}

        <button className="tab-add-button" onClick={addTab} title="Add tab" aria-label="Add tab">
          +
        </button>
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

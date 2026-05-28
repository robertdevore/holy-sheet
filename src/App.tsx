import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { ContextMenu } from './components/ContextMenu';
import { TabStrip } from './components/TabStrip';
import { useAppState } from './state/store';
import { parseWorkbook, serializeWorkbook, serializeCsv } from './utils/csv';
import { CellRange, getRangeBounds } from './utils/selection';
import { fillDown, fillRight } from './utils/fill';
import { useHotkeys } from './hooks/useHotkeys';
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
    setSelectedCell,
    setSelectedRange,
    setEditingCell,
    newFile,
    markSaved,
    setSaveError,
    setLoading,
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
  const [appVersion, setAppVersion] = useState('0.2.0');
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
  const handleOpenWithDelimiterRef = useRef<(delimiter: string) => Promise<void> | void>(
    async () => {},
  );
  const handleExportCsvRef = useRef<() => Promise<void> | void>(async () => {});
  const handleSaveRef = useRef<() => Promise<void> | void>(async () => {});
  const handleSaveAsRef = useRef<() => Promise<void> | void>(async () => {});

  useEffect(() => {
    // Get portable mode info
    window.electronAPI.getPortableInfo().then(setPortableInfo);
    window.electronAPI
      .getAppVersion()
      .then(setAppVersion)
      .catch(() => {});

    // Setup menu listeners
    const cleanupNew = window.electronAPI.onMenuNew(() => {
      void handleNewRef.current();
    });
    const cleanupOpen = window.electronAPI.onMenuOpen(() => {
      void handleOpenRef.current();
    });
    const cleanupSave = window.electronAPI.onMenuSave(() => {
      void handleSaveRef.current();
    });
    const cleanupSaveAs = window.electronAPI.onMenuSaveAs(() => {
      void handleSaveAsRef.current();
    });
    const cleanupOpenWithDelimiter = window.electronAPI.onMenuOpenWithDelimiter(
      (delimiter: string) => {
        void handleOpenWithDelimiterRef.current(delimiter);
      },
    );
    const cleanupExportCsv = window.electronAPI.onMenuExportCsv(() => {
      void handleExportCsvRef.current();
    });
    const cleanupUndo = window.electronAPI.onMenuUndo(() => undo());
    const cleanupRedo = window.electronAPI.onMenuRedo(() => redo());

    return () => {
      cleanupNew();
      cleanupOpen();
      cleanupSave();
      cleanupSaveAs();
      cleanupOpenWithDelimiter();
      cleanupExportCsv();
      cleanupUndo();
      cleanupRedo();
    };
  }, [undo, redo]);

  const handleSaveAs = useCallback(async () => {
    setLoading(true);
    setSaveError(null);
    const csvContent = serializeWorkbook(state.tabs);
    const result = await window.electronAPI.saveCsvAs(csvContent);

    if (result && result.success) {
      markSaved(result.path, result.name);
    } else if (result) {
      setSaveError(result.error || 'Failed to save');
    }
    setLoading(false);
  }, [state.tabs, markSaved, setLoading, setSaveError]);

  const handleSave = useCallback(async () => {
    if (!state.filePath) {
      return handleSaveAs();
    }

    setLoading(true);
    setSaveError(null);
    const csvContent = serializeWorkbook(state.tabs);
    const result = await window.electronAPI.saveCsv(state.filePath, csvContent);

    if (result.success) {
      markSaved();
    } else {
      setSaveError(result.error || 'Failed to save');
    }
    setLoading(false);
  }, [state.filePath, state.tabs, markSaved, handleSaveAs, setLoading, setSaveError]);

  const checkUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!state.isDirty) return true;

    const result = await window.electronAPI.confirmUnsavedChanges();
    if (result === 'cancel') return false;
    if (result === 'save') {
      await handleSave();
    }
    return true;
  }, [state.isDirty, handleSave]);

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

  const handleOpenWithDelimiter = useCallback(
    async (delimiter: string) => {
      const canProceed = await checkUnsavedChanges();
      if (!canProceed) return;

      const result = await window.electronAPI.openCsvWithDelimiter(delimiter);
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
    },
    [checkUnsavedChanges, setWorkbook],
  );

  const handleExportCsv = useCallback(async () => {
    const csvContent = serializeCsv(state.data);
    const suggestedName = state.fileName
      ? state.fileName.replace(/\.[^.]+$/, '') + '_export.csv'
      : 'export.csv';
    const result = await window.electronAPI.exportCsv(csvContent, suggestedName);
    if (result && result.success) {
      // Export doesn't mark the main file as saved — it's a separate file
    }
  }, [state.data, state.fileName]);

  const handlePanicClose = useCallback(() => {
    window.electronAPI.panicClose();
  }, []);

  useEffect(() => {
    handleNewRef.current = handleNew;
    handleOpenRef.current = handleOpen;
    handleOpenWithDelimiterRef.current = handleOpenWithDelimiter;
    handleExportCsvRef.current = handleExportCsv;
    handleSaveRef.current = handleSave;
    handleSaveAsRef.current = handleSaveAs;
  }, [handleNew, handleOpen, handleOpenWithDelimiter, handleExportCsv, handleSave, handleSaveAs]);

  const startTabRename = useCallback((tabId: string, tabName: string) => {
    setEditingTabId(tabId);
    setEditingTabName(tabName);
  }, []);

  const cancelTabRename = useCallback(() => {
    setEditingTabId(null);
    setEditingTabName('');
  }, []);

  const commitTabRename = useCallback(
    (tabId: string) => {
      renameTab(tabId, editingTabName);
      setEditingTabId(null);
      setEditingTabName('');
    },
    [renameTab, editingTabName],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      setSelectedCell({ row, col });
      setEditingCell(null);
    },
    [setSelectedCell, setEditingCell],
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      setEditingCell({ row, col });
    },
    [setEditingCell],
  );

  const handleCellEdit = useCallback(
    (row: number, col: number, value: string) => {
      setCellValue(row, col, value);
    },
    [setCellValue],
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
    [setSelectedRange],
  );

  const handleRowHeaderClick = useCallback(
    (row: number) => {
      const col_count = state.data[0]?.length || 0;
      if (col_count <= 0) return;

      setEditingCell(null);
      setSelectedRange({
        start: { row, col: 0 },
        end: { row, col: col_count - 1 },
      });
    },
    [state.data, setEditingCell, setSelectedRange],
  );

  const handleColHeaderClick = useCallback(
    (col: number) => {
      const row_count = state.data.length;
      if (row_count <= 0) return;

      setEditingCell(null);
      setSelectedRange({
        start: { row: 0, col },
        end: { row: row_count - 1, col },
      });
    },
    [state.data, setEditingCell, setSelectedRange],
  );

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

  const getSelectedRangeText = useCallback(
    (format: 'tsv' | 'csv' = 'tsv'): string | null => {
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
    },
    [state.selectedRange, state.data],
  );

  const pasteTextAtSelection = useCallback(
    (text: string) => {
      if (!state.selectedCell || state.editingCell || !text) return;

      const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n');

      // Trim trailing empty lines
      while (lines.length > 1 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }

      if (!lines.length) return;

      let rows: string[][];

      // Single line with no tabs: treat as one cell
      if (lines.length === 1 && !lines[0].includes('\t')) {
        // If the single line has consistent comma separation (same as multi-column CSV),
        // split by comma; otherwise keep as single cell
        const commaFields = lines[0].split(',');
        if (commaFields.length > 1) {
          rows = [commaFields];
        } else {
          rows = [[lines[0]]];
        }
      } else {
        // Multi-line or tab-containing: determine delimiter per row
        const hasTabs = lines.some((line) => line.includes('\t'));

        if (hasTabs) {
          rows = lines.map((line) => line.split('\t'));
        } else {
          // Check if comma-splitting is consistent across all rows
          const commaCounts = lines.map((line) => line.split(',').length);
          const allSameCommaCount = commaCounts.every((c) => c === commaCounts[0]);
          const hasMultipleCommaFields = commaCounts[0] > 1;

          if (allSameCommaCount && hasMultipleCommaFields) {
            rows = lines.map((line) => line.split(','));
          } else {
            // Treat each line as a single cell
            rows = lines.map((line) => [line]);
          }
        }
      }

      if (!rows.length) return;

      pasteData(state.selectedCell.row, state.selectedCell.col, rows);
    },
    [state.selectedCell, state.editingCell, pasteData],
  );

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

    const fillRows = fillDown(state.data, bounds.minRow, bounds.maxRow, bounds.minCol, bounds.maxCol);
    pasteData(bounds.minRow, bounds.minCol, fillRows);
  }, [state.selectedRange, state.data, pasteData]);

  const fillSelectionRight = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    if (bounds.maxCol === bounds.minCol) return;

    const fillRows = fillRight(state.data, bounds.minRow, bounds.maxRow, bounds.minCol, bounds.maxCol);
    pasteData(bounds.minRow, bounds.minCol, fillRows);
  }, [state.selectedRange, state.data, pasteData]);

  const insertFromSelection = useCallback(() => {
    if (!state.selectedRange) return;

    const bounds = getRangeBounds(state.selectedRange);
    const row_count = state.data.length;
    const col_count = state.data[0]?.length || 0;
    const is_full_row_selection =
      bounds.minCol === 0 && bounds.maxCol === Math.max(0, col_count - 1);
    const is_full_col_selection =
      bounds.minRow === 0 && bounds.maxRow === Math.max(0, row_count - 1);

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
    const is_full_row_selection =
      bounds.minCol === 0 && bounds.maxCol === Math.max(0, col_count - 1);
    const is_full_col_selection =
      bounds.minRow === 0 && bounds.maxRow === Math.max(0, row_count - 1);

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
      } catch {
        // Clipboard read may fail if permission denied — silently ignore
      }
    }
  }, [state.selectedCell, state.editingCell, pasteTextAtSelection]);

  const toggleSelectionFormat = useCallback(
    (formatType: 'bold' | 'italic' | 'underline') => {
      if (!state.selectedRange) return;
      toggleFormat(state.selectedRange, formatType);
    },
    [state.selectedRange, toggleFormat],
  );

  const setSelectionColor = useCallback(
    (colorType: 'textColor' | 'backgroundColor') => {
      if (!state.selectedRange) return;
      const value = 'textColor' === colorType ? textColorPicker : backgroundColorPicker;
      setFormatColor(state.selectedRange, colorType, value);
    },
    [state.selectedRange, setFormatColor, textColorPicker, backgroundColorPicker],
  );

  const clearSelectionColor = useCallback(
    (colorType: 'textColor' | 'backgroundColor') => {
      if (!state.selectedRange) return;
      setFormatColor(state.selectedRange, colorType, '');
    },
    [state.selectedRange, setFormatColor],
  );

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

  // Refs for stable hotkey access (avoids effect re-registration on every keystroke)
  const dataRef = useRef(state.data);
  const selectedCellRef = useRef(state.selectedCell);

  // Keep refs current without triggering re-renders
  useEffect(() => {
    dataRef.current = state.data;
    selectedCellRef.current = state.selectedCell;
  });

  useHotkeys({
    dataRef,
    selectedCellRef,
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

  return (
    <div className={`app ${isMac ? 'is-macos' : ''}`}>
      <Toolbar
        appVersion={appVersion}
        fileName={state.fileName}
        isDirty={state.isDirty}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
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

      <TabStrip
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        editingTabId={editingTabId}
        editingTabName={editingTabName}
        canDeleteTab={state.tabs.length > 1}
        onSwitchTab={switchTab}
        onStartRename={startTabRename}
        onCommitRename={commitTabRename}
        onCancelRename={cancelTabRename}
        onDeleteTab={deleteTab}
        onAddTab={addTab}
        onEditingNameChange={setEditingTabName}
      />

      <StatusBar
        selectedCell={state.selectedCell}
        selectedRange={state.selectedRange}
        rowCount={state.data.length}
        colCount={state.data[0]?.length || 0}
        isPortable={portableInfo?.isPortable || false}
        lastSavedAt={state.lastSavedAt}
        saveError={state.saveError}
        isLoading={state.isLoading}
      />

      {contextMenu && (
        <ContextMenu
          type={contextMenu.type}
          index={contextMenu.index}
          x={contextMenu.x}
          y={contextMenu.y}
          onInsertRow={insertRow}
          onDeleteRow={deleteRow}
          onInsertColumn={insertColumn}
          onDeleteColumn={deleteColumn}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default App;

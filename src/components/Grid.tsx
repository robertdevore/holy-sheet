import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { VariableSizeGrid as VirtualGrid } from 'react-window';
import { CellRenderer } from './CellRenderer';
import {
  CellCoord,
  CellRange,
  colIndexToLetter,
  getRangeBounds,
  isCellInRange,
} from '../utils/selection';

interface GridProps {
  data: string[][];
  cellFormats: Record<
    string,
    {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      textColor?: string;
      backgroundColor?: string;
    }
  >;
  columnWidths: number[];
  selectedCell: CellCoord | null;
  selectedRange: CellRange | null;
  editingCell: CellCoord | null;
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onCellEdit: (row: number, col: number, value: string) => void;
  onEditComplete: () => void;
  onEditCancel: () => void;
  onRangeSelect: (range: CellRange) => void;
  onRowHeaderClick: (row: number) => void;
  onColHeaderClick: (col: number) => void;
  onRowHeaderContextMenu: (row: number, event: React.MouseEvent) => void;
  onColHeaderContextMenu: (col: number, event: React.MouseEvent) => void;
  onInsertRow: (rowIndex: number) => void;
  onRowMove: (fromIndex: number, toIndex: number) => void;
  onColMove: (fromIndex: number, toIndex: number) => void;
  onColumnWidthsChange: (columnWidths: number[]) => void;
  onOpenExternalUrl: (url: string) => void;
}

const CELL_WIDTH = 120;
const CELL_HEIGHT = 30;
const HEADER_SIZE = 40;
const MIN_COLUMN_WIDTH = 60;

export const Grid: React.FC<GridProps> = (props: GridProps) => {
  const {
    data,
    cellFormats,
    columnWidths: persistedColumnWidths,
    selectedCell,
    selectedRange,
    editingCell,
    onCellClick,
    onCellDoubleClick,
    onCellEdit,
    onEditComplete,
    onEditCancel,
    onRangeSelect,
    onRowHeaderClick,
    onColHeaderClick,
    onRowHeaderContextMenu,
    onColHeaderContextMenu,
    onInsertRow,
    onRowMove,
    onColMove,
    onColumnWidthsChange,
    onOpenExternalUrl,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CellCoord | null>(null);
  const [gridSize, setGridSize] = useState({ width: 1000, height: 600 });
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const colHeadersRef = useRef<HTMLDivElement>(null);
  const rowHeadersRef = useRef<HTMLDivElement>(null);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const prevEditingCell = useRef<CellCoord | null>(null);
  const pending_initial_edit_value = useRef<string | null>(null);
  const resize_start_x = useRef(0);
  const resize_start_width = useRef(CELL_WIDTH);
  const suppressHeaderClick = useRef(false);
  const headerDragOrigin = useRef<{
    type: 'row' | 'col';
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const onInsertRowRef = useRef(onInsertRow);
  const columnWidthsRef = useRef<number[]>([]);
  const onCellClickRef = useRef(onCellClick);
  const onCellDoubleClickRef = useRef(onCellDoubleClick);

  const rowCount = data.length;
  const colCount = data[0]?.length || 0;

  useEffect(() => {
    onInsertRowRef.current = onInsertRow;
    onCellClickRef.current = onCellClick;
    onCellDoubleClickRef.current = onCellDoubleClick;
  }, [onInsertRow, onCellClick, onCellDoubleClick]);

  useEffect(() => {
    columnWidthsRef.current = columnWidths;
  }, [columnWidths]);

  const commitEdit = useCallback(
    (row: number, col: number, value: string) => {
      onCellEdit(row, col, value);
      onEditComplete();
    },
    [onCellEdit, onEditComplete],
  );

  // Sync local column widths from persisted props (intentional prop→state sync)
  useEffect(() => {
    const next = (persistedColumnWidths || []).slice(0, colCount).map((width) => {
      const numeric_width = Number(width);
      return Number.isFinite(numeric_width) && numeric_width > 0 ? numeric_width : 0;
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumnWidths(next);
  }, [persistedColumnWidths, colCount]);

  const getColumnWidth = useCallback(
    (index: number) => {
      return columnWidths[index] || CELL_WIDTH;
    },
    [columnWidths],
  );

  const totalColumnWidth = useMemo(
    () =>
      Array.from({ length: colCount }).reduce((total: number, _value, index: number) => {
        return total + getColumnWidth(index);
      }, 0),
    [colCount, getColumnWidth],
  );
  const selectionBounds = useMemo(
    () => (selectedRange ? getRangeBounds(selectedRange) : null),
    [selectedRange],
  );
  const isFullRowSelection = useMemo(
    () =>
      !!selectionBounds &&
      selectionBounds.minCol === 0 &&
      selectionBounds.maxCol === Math.max(0, colCount - 1),
    [selectionBounds, colCount],
  );
  const isFullColSelection = useMemo(
    () =>
      !!selectionBounds &&
      selectionBounds.minRow === 0 &&
      selectionBounds.maxRow === Math.max(0, rowCount - 1),
    [selectionBounds, rowCount],
  );

  // Update grid size on window resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      const width = Math.max(0, containerRef.current.clientWidth - HEADER_SIZE);
      const height = Math.max(0, containerRef.current.clientHeight - HEADER_SIZE);
      setGridSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Keep editor value/focus stable while typing
  useEffect(() => {
    if (!editingCell) {
      prevEditingCell.current = null;
      return;
    }

    const isNewEdit =
      !prevEditingCell.current ||
      prevEditingCell.current.row !== editingCell.row ||
      prevEditingCell.current.col !== editingCell.col;
    const hasPendingInitialValue = null !== pending_initial_edit_value.current;

    if (isNewEdit) {
      const value = data[editingCell.row]?.[editingCell.col] || '';
      const initial_value =
        null !== pending_initial_edit_value.current ? pending_initial_edit_value.current : value;
      setEditValue(initial_value);
      pending_initial_edit_value.current = null;
    }

    const raf_id = window.requestAnimationFrame(() => {
      if (!editInputRef.current) return;
      if (document.activeElement !== editInputRef.current) {
        editInputRef.current.focus();
      }
      if (isNewEdit) {
        if (hasPendingInitialValue) {
          const value_length = editInputRef.current.value.length;
          editInputRef.current.setSelectionRange(value_length, value_length);
        } else {
          editInputRef.current.select();
        }
      }
    });

    prevEditingCell.current = { row: editingCell.row, col: editingCell.col };

    return () => {
      window.cancelAnimationFrame(raf_id);
    };
  }, [editingCell, data]);

  // Ensure focus stays on the active editor as value updates during typing
  useEffect(() => {
    if (!editingCell) return;

    const raf_id = window.requestAnimationFrame(() => {
      if (!editInputRef.current) return;
      if (document.activeElement !== editInputRef.current) {
        editInputRef.current.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(raf_id);
    };
  }, [editingCell, editValue]);

  // Handle keyboard navigation when not editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ('INPUT' === target.tagName || 'TEXTAREA' === target.tagName || target.isContentEditable)
      ) {
        return;
      }

      if (editingCell) {
        return;
      }

      if (!selectedCell) return;

      // Handle navigation keys
      let newRow = selectedCell.row;
      let newCol = selectedCell.col;
      const is_modifier_pressed = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = is_modifier_pressed ? 0 : Math.max(0, selectedCell.row - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = is_modifier_pressed
            ? Math.max(0, rowCount - 1)
            : Math.min(rowCount - 1, selectedCell.row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = is_modifier_pressed ? 0 : Math.max(0, selectedCell.col - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = is_modifier_pressed
            ? Math.max(0, colCount - 1)
            : Math.min(colCount - 1, selectedCell.col + 1);
          break;
        case 'Home':
          e.preventDefault();
          newCol = 0;
          break;
        case 'End':
          e.preventDefault();
          newCol = Math.max(0, colCount - 1);
          break;
        case 'PageUp':
          e.preventDefault();
          newRow = Math.max(0, selectedCell.row - 20);
          break;
        case 'PageDown':
          e.preventDefault();
          newRow = Math.min(rowCount - 1, selectedCell.row + 20);
          break;
        case 'Enter':
          e.preventDefault();
          onCellDoubleClick(selectedCell.row, selectedCell.col);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedRange) {
            // Clear selected cells
            const bounds = getRangeBounds(selectedRange);
            for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
              for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
                onCellEdit(r, c, '');
              }
            }
          }
          break;
        case 'Tab':
          e.preventDefault();
          newCol = e.shiftKey
            ? Math.max(0, selectedCell.col - 1)
            : Math.min(colCount - 1, selectedCell.col + 1);
          break;
        default:
          // Start editing on alphanumeric key
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            pending_initial_edit_value.current = e.key;
            onCellDoubleClick(selectedCell.row, selectedCell.col);
          }
          return;
      }

      // Shift+Arrow: extend selection range from original anchor
      if (e.shiftKey && !is_modifier_pressed) {
        const anchor = selectedRange ? selectedRange.start : selectedCell;
        if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
          onRangeSelect({ start: anchor, end: { row: newRow, col: newCol } });
        }
        return;
      }

      if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
        onCellClick(newRow, newCol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCell,
    editingCell,
    editValue,
    selectedRange,
    rowCount,
    colCount,
    onCellClick,
    onCellDoubleClick,
    onCellEdit,
    onEditComplete,
    onEditCancel,
    onRangeSelect,
  ]);

  const handleMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      if (editingCell) {
        const is_same_cell = editingCell.row === row && editingCell.col === col;
        if (!is_same_cell) {
          onCellEdit(editingCell.row, editingCell.col, editValue);
          onEditComplete();
        }
      }

      // Shift+Click: extend selection from active cell to clicked cell
      if (e.shiftKey && selectedCell) {
        onRangeSelect({ start: selectedCell, end: { row, col } });
        return;
      }

      setIsDragging(true);
      setDragStart({ row, col });
      onCellClick(row, col);
    },
    [editingCell, editValue, onCellClick, onCellEdit, onEditComplete, selectedCell, onRangeSelect],
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging && dragStart) {
        onRangeSelect({ start: dragStart, end: { row, col } });
      }
    },
    [isDragging, dragStart, onRangeSelect],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleColumnResizeStart = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(col);
      resize_start_x.current = e.clientX;
      resize_start_width.current = getColumnWidth(col);
    },
    [getColumnWidth],
  );

  useEffect(() => {
    if (null === resizingColumn) return;

    const handleResizeMove = (e: MouseEvent) => {
      const delta = e.clientX - resize_start_x.current;
      const next_width = Math.max(MIN_COLUMN_WIDTH, resize_start_width.current + delta);

      setColumnWidths((prev: number[]) => {
        if (prev[resizingColumn] === next_width) return prev;
        const next = [...prev];
        next[resizingColumn] = next_width;
        return next;
      });

      if (gridRef.current && gridRef.current.resetAfterColumnIndex) {
        gridRef.current.resetAfterColumnIndex(resizingColumn);
      }
    };

    const handleResizeEnd = () => {
      setResizingColumn(null);
      onColumnWidthsChange(columnWidthsRef.current.slice());
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizingColumn, onColumnWidthsChange]);

  const handleGridScroll = useCallback(
    ({ scrollLeft: sl, scrollTop: st }: { scrollLeft: number; scrollTop: number }) => {
      // Update DOM directly for headers to avoid React re-renders on every scroll tick
      if (colHeadersRef.current) {
        colHeadersRef.current.style.transform = `translateX(-${sl}px)`;
      }
      if (rowHeadersRef.current) {
        rowHeadersRef.current.style.transform = `translateY(-${st}px)`;
      }
    },
    [],
  );

  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const isSingle =
      !!selectedRange &&
      selectedRange.start.row === selectedRange.end.row &&
      selectedRange.start.col === selectedRange.end.col;
    const isSel =
      isSingle &&
      selectedCell?.row === rowIndex &&
      selectedCell?.col === columnIndex;
    const inRange = selectedRange
      ? isCellInRange({ row: rowIndex, col: columnIndex }, selectedRange)
      : false;
    const rb = selectionBounds;
    const isTop = !!rb && inRange && rowIndex === rb.minRow;
    const isBottom = !!rb && inRange && rowIndex === rb.maxRow;
    const isLeft = !!rb && inRange && columnIndex === rb.minCol;
    const isRight = !!rb && inRange && columnIndex === rb.maxCol;
    const isEdit = editingCell?.row === rowIndex && editingCell?.col === columnIndex;
    const val = data[rowIndex]?.[columnIndex] || '';
    const fmt = cellFormats[`${rowIndex}:${columnIndex}`] || {};

    return (
      <CellRenderer
        rowIndex={rowIndex}
        columnIndex={columnIndex}
        style={style}
        value={val}
        format={fmt}
        isSelected={isSel}
        isInRange={inRange}
        isRangeTop={isTop}
        isRangeBottom={isBottom}
        isRangeLeft={isLeft}
        isRangeRight={isRight}
        isSingleCellSelection={isSingle}
        isEditing={isEdit}
        editValue={editValue}
        rowCount={rowCount}
        colCount={colCount}
        onCellClick={onCellClick}
        onCellDoubleClick={onCellDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onEditValueChange={setEditValue}
        onEditCommit={commitEdit}
        onEditCancel={onEditCancel}
        onCellNavigate={onCellClick}
        onOpenExternalUrl={onOpenExternalUrl}
        editInputRef={editInputRef}
        pendingInitialEditValue={pending_initial_edit_value}
        prevEditingCell={prevEditingCell}
      />
    );
  };

  // Empty state: show message when grid has no data
  const isEmpty =
    data.every((row) => row.every((cell) => cell === '')) &&
    data.length <= 20 &&
    (data[0]?.length || 0) <= 10;

  return (
    <div className="grid-container" ref={containerRef} role="grid" aria-label="Spreadsheet">
      {isEmpty && !editingCell && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666a57',
            fontSize: '14px',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          This CSV file is empty.
          <br />
          Start typing or open a file to begin.
        </div>
      )}
      {/* Column headers */}
      <div className="column-headers">
        <div
          className="column-headers-inner"
          ref={colHeadersRef}
          style={{ width: `${Math.max(totalColumnWidth, gridSize.width)}px` }}
        >
          {Array.from({ length: colCount }).map((_, i) => (
            <div
              key={i}
              className={`column-header ${isFullColSelection && selectionBounds && i >= selectionBounds.minCol && i <= selectionBounds.maxCol ? 'selected-header' : ''}`}
              style={{ width: getColumnWidth(i) }}
              role="columnheader"
              aria-label={`Column ${colIndexToLetter(i)}`}
              draggable
              onClick={() => {
                if (suppressHeaderClick.current) return;
                onColHeaderClick(i);
              }}
              onMouseDown={(e: React.MouseEvent) => {
                headerDragOrigin.current = { type: 'col', index: i, x: e.clientX, y: e.clientY };
              }}
              onDragStart={(e: React.DragEvent) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('column-resize-handle')) {
                  e.preventDefault();
                  return;
                }

                const origin = headerDragOrigin.current;
                if (!origin || origin.type !== 'col' || origin.index !== i) {
                  e.preventDefault();
                  return;
                }

                const movedX = Math.abs(e.clientX - origin.x);
                const movedY = Math.abs(e.clientY - origin.y);
                if (movedX < 3 && movedY < 3) {
                  e.preventDefault();
                  return;
                }

                suppressHeaderClick.current = true;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                const fromValue = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isNaN(fromValue) || fromValue === i) return;
                onColMove(fromValue, i);
              }}
              onDragEnd={() => {
                headerDragOrigin.current = null;
                window.setTimeout(() => {
                  suppressHeaderClick.current = false;
                }, 0);
              }}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                onColHeaderContextMenu(i, e);
              }}
            >
              {colIndexToLetter(i)}
              <div
                className="column-resize-handle"
                onMouseDown={(e: React.MouseEvent) => handleColumnResizeStart(i, e)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row headers */}
      <div className="row-headers">
        <div className="row-headers-inner" ref={rowHeadersRef}>
          {Array.from({ length: rowCount }).map((_, i) => (
            <div
              key={i}
              className={`row-header ${isFullRowSelection && selectionBounds && i >= selectionBounds.minRow && i <= selectionBounds.maxRow ? 'selected-header' : ''}`}
              style={{ height: CELL_HEIGHT }}
              role="rowheader"
              aria-label={`Row ${i + 1}`}
              draggable
              onClick={() => {
                if (suppressHeaderClick.current) return;
                onRowHeaderClick(i);
              }}
              onMouseDown={(e: React.MouseEvent) => {
                headerDragOrigin.current = { type: 'row', index: i, x: e.clientX, y: e.clientY };
              }}
              onDragStart={(e: React.DragEvent) => {
                const origin = headerDragOrigin.current;
                if (!origin || origin.type !== 'row' || origin.index !== i) {
                  e.preventDefault();
                  return;
                }

                const movedX = Math.abs(e.clientX - origin.x);
                const movedY = Math.abs(e.clientY - origin.y);
                if (movedX < 3 && movedY < 3) {
                  e.preventDefault();
                  return;
                }

                suppressHeaderClick.current = true;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                const fromValue = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isNaN(fromValue) || fromValue === i) return;
                onRowMove(fromValue, i);
              }}
              onDragEnd={() => {
                headerDragOrigin.current = null;
                window.setTimeout(() => {
                  suppressHeaderClick.current = false;
                }, 0);
              }}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                onRowHeaderContextMenu(i, e);
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual grid */}
      <div className="grid-viewport">
        <VirtualGrid
          ref={gridRef}
          columnCount={colCount}
          columnWidth={getColumnWidth}
          height={gridSize.height}
          onScroll={handleGridScroll}
          rowCount={rowCount}
          rowHeight={() => CELL_HEIGHT}
          width={gridSize.width}
        >
          {Cell}
        </VirtualGrid>
      </div>
    </div>
  );
};

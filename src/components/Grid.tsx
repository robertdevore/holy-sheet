import React, { useRef, useCallback, useEffect, useState } from 'react';
import { VariableSizeGrid as VirtualGrid } from 'react-window';
import { CellCoord, CellRange, colIndexToLetter, getRangeBounds, isCellInRange } from '../utils/selection';

interface GridProps {
  data: string[][];
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
}

const CELL_WIDTH = 120;
const CELL_HEIGHT = 30;
const HEADER_SIZE = 40;
const MIN_COLUMN_WIDTH = 60;

export const Grid: React.FC<GridProps> = (props: GridProps) => {
  const {
    data,
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
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<CellCoord | null>(null);
  const [gridSize, setGridSize] = useState({ width: 1000, height: 600 });
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const prevEditingCell = useRef<CellCoord | null>(null);
  const pending_initial_edit_value = useRef<string | null>(null);
  const resize_start_x = useRef(0);
  const resize_start_width = useRef(CELL_WIDTH);

  const rowCount = data.length;
  const colCount = data[0]?.length || 0;

  useEffect(() => {
    setColumnWidths((prev: number[]) => {
      const next = prev.slice(0, colCount);
      while (next.length < colCount) {
        next.push(CELL_WIDTH);
      }
      return next;
    });
  }, [colCount]);

  const getColumnWidth = useCallback((index: number) => {
    return columnWidths[index] || CELL_WIDTH;
  }, [columnWidths]);

  const totalColumnWidth = columnWidths.reduce((total: number, width: number) => total + width, 0);
  const selectionBounds = selectedRange ? getRangeBounds(selectedRange) : null;
  const isFullRowSelection = !!selectionBounds && selectionBounds.minCol === 0 && selectionBounds.maxCol === Math.max(0, colCount - 1);
  const isFullColSelection = !!selectionBounds && selectionBounds.minRow === 0 && selectionBounds.maxRow === Math.max(0, rowCount - 1);

  // Update grid size on window resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      const width = Math.max(0, containerRef.current.clientWidth - HEADER_SIZE);
      const height = Math.max(0, containerRef.current.clientHeight - HEADER_SIZE);
      setGridSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keep editor value/focus stable while typing
  useEffect(() => {
    if (!editingCell) {
      prevEditingCell.current = null;
      return;
    }

    const isNewEdit = !prevEditingCell.current ||
      prevEditingCell.current.row !== editingCell.row ||
      prevEditingCell.current.col !== editingCell.col;
    const hasPendingInitialValue = null !== pending_initial_edit_value.current;

    if (isNewEdit) {
      const value = data[editingCell.row]?.[editingCell.col] || '';
      const initial_value = null !== pending_initial_edit_value.current ? pending_initial_edit_value.current : value;
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
        const value_length = editInputRef.current.value.length;
        editInputRef.current.setSelectionRange(value_length, value_length);
      }
    });

    return () => {
      window.cancelAnimationFrame(raf_id);
    };
  }, [editingCell, editValue]);

  // Handle keyboard navigation when not editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          newRow = is_modifier_pressed ? Math.max(0, rowCount - 1) : Math.min(rowCount - 1, selectedCell.row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = is_modifier_pressed ? 0 : Math.max(0, selectedCell.col - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = is_modifier_pressed ? Math.max(0, colCount - 1) : Math.min(colCount - 1, selectedCell.col + 1);
          break;
        case 'Home':
          e.preventDefault();
          newCol = 0;
          break;
        case 'End':
          e.preventDefault();
          newCol = Math.max(0, colCount - 1);
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

      if (newRow !== selectedCell.row || newCol !== selectedCell.col) {
        onCellClick(newRow, newCol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, editValue, selectedRange, rowCount, colCount, onCellClick, onCellDoubleClick, onCellEdit, onEditComplete, onEditCancel]);

  const handleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    if (editingCell) {
      const is_same_cell = editingCell.row === row && editingCell.col === col;
      if (!is_same_cell) {
        onCellEdit(editingCell.row, editingCell.col, editValue);
        onEditComplete();
      }
    }

    setIsDragging(true);
    setDragStart({ row, col });
    onCellClick(row, col);
  }, [editingCell, editValue, onCellClick, onCellEdit, onEditComplete]);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isDragging && dragStart) {
      onRangeSelect({ start: dragStart, end: { row, col } });
    }
  }, [isDragging, dragStart, onRangeSelect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleColumnResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(col);
    resize_start_x.current = e.clientX;
    resize_start_width.current = getColumnWidth(col);
  }, [getColumnWidth]);

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
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizingColumn]);

  const handleGridScroll = useCallback(({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
    setScrollLeft(scrollLeft);
    setScrollTop(scrollTop);
  }, []);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const is_single_cell_selection = !!selectedRange &&
      selectedRange.start.row === selectedRange.end.row &&
      selectedRange.start.col === selectedRange.end.col;
    const isSelected = is_single_cell_selection && selectedCell?.row === rowIndex && selectedCell?.col === columnIndex;
    const isInRange = selectedRange ? isCellInRange({ row: rowIndex, col: columnIndex }, selectedRange) : false;
    const rangeBounds = selectedRange ? getRangeBounds(selectedRange) : null;
    const isRangeTop = !!rangeBounds && isInRange && rowIndex === rangeBounds.minRow;
    const isRangeBottom = !!rangeBounds && isInRange && rowIndex === rangeBounds.maxRow;
    const isRangeLeft = !!rangeBounds && isInRange && columnIndex === rangeBounds.minCol;
    const isRangeRight = !!rangeBounds && isInRange && columnIndex === rangeBounds.maxCol;
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === columnIndex;
    const value = data[rowIndex]?.[columnIndex] || '';

    const rangeOutlineShadows: string[] = [];
    if (isInRange && !is_single_cell_selection) {
      if (isRangeTop) rangeOutlineShadows.push('inset 0 2px 0 var(--accent)');
      if (isRangeBottom) rangeOutlineShadows.push('inset 0 -2px 0 var(--accent)');
      if (isRangeLeft) rangeOutlineShadows.push('inset 2px 0 0 var(--accent)');
      if (isRangeRight) rangeOutlineShadows.push('inset -2px 0 0 var(--accent)');
    }

    const cellStyle = rangeOutlineShadows.length > 0
      ? { ...style, boxShadow: rangeOutlineShadows.join(', ') }
      : style;

    return (
      <div
        style={cellStyle}
        className={`cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
        onClick={() => onCellClick(rowIndex, columnIndex)}
        onDoubleClick={() => onCellDoubleClick(rowIndex, columnIndex)}
        onMouseDown={(e: React.MouseEvent) => handleMouseDown(rowIndex, columnIndex, e)}
        onMouseEnter={() => handleMouseEnter(rowIndex, columnIndex)}
      >
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                onCellEdit(rowIndex, columnIndex, editValue);
                onEditComplete();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onEditCancel();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                onCellEdit(rowIndex, columnIndex, editValue);
                onEditComplete();
                const nextCol = e.shiftKey
                  ? Math.max(0, columnIndex - 1)
                  : Math.min(colCount - 1, columnIndex + 1);
                onCellClick(rowIndex, nextCol);
              }
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="cell-edit-input"
          />
        ) : (
          <span className="cell-value">{value}</span>
        )}
      </div>
    );
  };

  return (
    <div className="grid-container" ref={containerRef}>
      {/* Column headers */}
      <div className="column-headers">
        <div
          className="column-headers-inner"
          style={{
            width: `${Math.max(totalColumnWidth, gridSize.width)}px`,
            transform: `translateX(-${scrollLeft}px)`,
          }}
        >
          {Array.from({ length: colCount }).map((_, i) => (
            <div
              key={i}
              className={`column-header ${isFullColSelection && selectionBounds && i >= selectionBounds.minCol && i <= selectionBounds.maxCol ? 'selected-header' : ''}`}
              style={{ width: getColumnWidth(i) }}
              onClick={() => onColHeaderClick(i)}
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
        <div
          className="row-headers-inner"
          style={{ transform: `translateY(-${scrollTop}px)` }}
        >
          {Array.from({ length: rowCount }).map((_, i) => (
            <div
              key={i}
              className={`row-header ${isFullRowSelection && selectionBounds && i >= selectionBounds.minRow && i <= selectionBounds.maxRow ? 'selected-header' : ''}`}
              style={{ height: CELL_HEIGHT }}
              onClick={() => onRowHeaderClick(i)}
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

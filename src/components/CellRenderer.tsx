import React, { memo, useRef, useEffect } from 'react';
import { colIndexToLetter } from '../utils/selection';

interface CellRendererProps {
  rowIndex: number;
  columnIndex: number;
  style: React.CSSProperties;
  value: string;
  format: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    textColor?: string;
    backgroundColor?: string;
  };
  isSelected: boolean;
  isInRange: boolean;
  isRangeTop: boolean;
  isRangeBottom: boolean;
  isRangeLeft: boolean;
  isRangeRight: boolean;
  isSingleCellSelection: boolean;
  isEditing: boolean;
  editValue: string;
  rowCount: number;
  colCount: number;
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onMouseEnter: (row: number, col: number) => void;
  onEditValueChange: (value: string) => void;
  onEditCommit: (row: number, col: number, value: string) => void;
  onEditCancel: () => void;
  onCellNavigate: (row: number, col: number) => void;
  onInsertRow: (rowIndex: number) => void;
  onFocusAndSelect: (row: number, col: number) => void;
  onOpenExternalUrl: (url: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  pendingInitialEditValue: React.MutableRefObject<string | null>;
  prevEditingCell: React.MutableRefObject<CellCoord | null>;
}

interface CellCoord {
  row: number;
  col: number;
}

export const CellRenderer = memo(function CellRenderer(props: CellRendererProps) {
  const {
    rowIndex,
    columnIndex,
    style,
    value,
    format,
    isSelected,
    isInRange,
    isRangeTop,
    isRangeBottom,
    isRangeLeft,
    isRangeRight,
    isSingleCellSelection,
    isEditing,
    editValue,
    rowCount,
    colCount,
    onCellClick,
    onCellDoubleClick,
    onMouseDown,
    onMouseEnter,
    onEditValueChange,
    onEditCommit,
    onEditCancel,
    onCellNavigate,
    onInsertRow,
    onFocusAndSelect,
    onOpenExternalUrl,
    editInputRef,
  } = props;

  const textStyle: React.CSSProperties = {
    fontWeight: format.bold ? 700 : undefined,
    fontStyle: format.italic ? 'italic' : undefined,
    textDecoration: format.underline ? 'underline' : undefined,
    color: format.textColor || undefined,
  };

  const rangeOutlineShadows: string[] = [];
  if (isInRange && !isSingleCellSelection) {
    if (isRangeTop) rangeOutlineShadows.push('inset 0 2px 0 var(--accent)');
    if (isRangeBottom) rangeOutlineShadows.push('inset 0 -2px 0 var(--accent)');
    if (isRangeLeft) rangeOutlineShadows.push('inset 2px 0 0 var(--accent)');
    if (isRangeRight) rangeOutlineShadows.push('inset -2px 0 0 var(--accent)');
  }

  const cellStyle =
    rangeOutlineShadows.length > 0
      ? {
          ...style,
          boxShadow: rangeOutlineShadows.join(', '),
          backgroundColor: format.backgroundColor || undefined,
        }
      : { ...style, backgroundColor: format.backgroundColor || undefined };

  return (
    <div
      style={cellStyle}
      className={`cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
      role="gridcell"
      aria-selected={isSelected || isInRange}
      aria-label={`${colIndexToLetter(columnIndex)}${rowIndex + 1}: ${value || 'empty'}`}
      aria-readonly={!isEditing}
      onClick={() => onCellClick(rowIndex, columnIndex)}
      onDoubleClick={() => onCellDoubleClick(rowIndex, columnIndex)}
      onMouseDown={(e: React.MouseEvent) => onMouseDown(rowIndex, columnIndex, e)}
      onMouseEnter={() => onMouseEnter(rowIndex, columnIndex)}
    >
      {isEditing ? (
        <CellEditInput
          rowIndex={rowIndex}
          columnIndex={columnIndex}
          editValue={editValue}
          rowCount={rowCount}
          colCount={colCount}
          textStyle={textStyle}
          onEditValueChange={onEditValueChange}
          onEditCommit={onEditCommit}
          onEditCancel={onEditCancel}
          onCellNavigate={onCellNavigate}
          onInsertRow={onInsertRow}
          onFocusAndSelect={onFocusAndSelect}
          editInputRef={editInputRef}
        />
      ) : /^(https?:\/\/|www\.)\S+$/i.test(value.trim()) ? (
        <a
          href="#"
          className="cell-link"
          style={textStyle}
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenExternalUrl(value.trim());
          }}
        >
          {value}
        </a>
      ) : (
        <span className="cell-value" style={textStyle}>
          {value}
        </span>
      )}
    </div>
  );
});

// Separate component for the edit input to avoid re-rendering the entire cell on each keystroke
const CellEditInput = memo(function CellEditInput({
  rowIndex,
  columnIndex,
  editValue,
  rowCount,
  colCount,
  textStyle,
  onEditValueChange,
  onEditCommit,
  onEditCancel,
  onCellNavigate,
  onInsertRow,
  onFocusAndSelect,
  editInputRef,
}: {
  rowIndex: number;
  columnIndex: number;
  editValue: string;
  rowCount: number;
  colCount: number;
  textStyle: React.CSSProperties;
  onEditValueChange: (value: string) => void;
  onEditCommit: (row: number, col: number, value: string) => void;
  onEditCancel: () => void;
  onCellNavigate: (row: number, col: number) => void;
  onInsertRow: (rowIndex: number) => void;
  onFocusAndSelect: (row: number, col: number) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  // Focus management
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (editInputRef?.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [editInputRef]);

  // Sync our local ref to the forwarded ref
  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (editInputRef) {
      (editInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }
  };

  return (
    <input
      ref={setRefs}
      type="text"
      value={editValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEditValueChange(e.target.value)}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();

        const isMod = e.metaKey || e.ctrlKey;
        if (isMod && 'a' === e.key.toLowerCase()) {
          e.preventDefault();
          const input = e.currentTarget;
          input.setSelectionRange(0, input.value.length);
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          onEditCommit(rowIndex, columnIndex, editValue);

          if (!e.shiftKey && rowIndex === rowCount - 1) {
            window.setTimeout(() => {
              onInsertRow(rowCount);
              onFocusAndSelect(rowIndex + 1, columnIndex);
            }, 0);
            return;
          }

          const nextRow = e.shiftKey ? Math.max(0, rowIndex - 1) : rowIndex + 1;
          onFocusAndSelect(nextRow, columnIndex);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onEditCancel();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          onEditCommit(rowIndex, columnIndex, editValue);
          const nextCol = e.shiftKey
            ? Math.max(0, columnIndex - 1)
            : Math.min(colCount - 1, columnIndex + 1);
          onCellNavigate(rowIndex, nextCol);
        }
      }}
      onBlur={() => {
        onEditCommit(rowIndex, columnIndex, editValue);
      }}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onDoubleClick={(e: React.MouseEvent) => e.stopPropagation()}
      className="cell-edit-input"
      style={textStyle}
    />
  );
});

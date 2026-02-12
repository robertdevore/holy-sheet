import React from 'react';
import { CellCoord, CellRange, coordToA1, formatRangeSize } from '../utils/selection';

interface StatusBarProps {
  selectedCell: CellCoord | null;
  selectedRange: CellRange | null;
  rowCount: number;
  colCount: number;
  isPortable: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selectedCell,
  selectedRange,
  rowCount,
  colCount,
  isPortable,
}) => {
  const cellRef = selectedCell ? coordToA1(selectedCell) : '';
  const rangeSize = selectedRange ? formatRangeSize(selectedRange) : '';

  return (
    <div className="status-bar">
      <div className="status-section">
        {isPortable && (
          <span className="portable-badge" title="Running in portable mode">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" />
              <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
              <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
            </svg>
            Portable
          </span>
        )}
      </div>
      <div className="status-section">
        {selectedCell && (
          <>
            <span className="status-label">Cell:</span>
            <span className="status-value">{cellRef}</span>
          </>
        )}
      </div>
      <div className="status-section">
        <span className="status-label">Rows:</span>
        <span className="status-value">{rowCount}</span>
      </div>
      <div className="status-section">
        <span className="status-label">Columns:</span>
        <span className="status-value">{colCount}</span>
      </div>
      {selectedRange && rangeSize !== '1 cell' && (
        <div className="status-section">
          <span className="status-label">Selection:</span>
          <span className="status-value">{rangeSize}</span>
        </div>
      )}
    </div>
  );
};

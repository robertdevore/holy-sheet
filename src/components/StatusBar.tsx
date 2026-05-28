import React from 'react';
import { CellCoord, CellRange, coordToA1, formatRangeSize } from '../utils/selection';

interface StatusBarProps {
  selectedCell: CellCoord | null;
  selectedRange: CellRange | null;
  rowCount: number;
  colCount: number;
  isPortable: boolean;
  lastSavedAt: number | null;
  saveError: string | null;
  isLoading: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selectedCell,
  selectedRange,
  rowCount,
  colCount,
  isPortable,
  lastSavedAt,
  saveError,
  isLoading,
}) => {
  const cellRef = selectedCell ? coordToA1(selectedCell) : '';
  const rangeSize = selectedRange ? formatRangeSize(selectedRange) : '';
  const savedTime =
    lastSavedAt && !saveError
      ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

  return (
    <div className="status-bar">
      <div className="status-section">
        {isPortable && (
          <span className="portable-badge" title="Running in portable mode">
            Portable
          </span>
        )}
      </div>

      {isLoading && (
        <div className="status-section">
          <span className="status-value" style={{ color: '#6f7560' }}>
            Working…
          </span>
        </div>
      )}

      {saveError && (
        <div className="status-section">
          <span className="status-value" style={{ color: '#ef4444' }}>
            {saveError}
          </span>
        </div>
      )}

      {savedTime && (
        <div className="status-section">
          <span className="status-label">Saved:</span>
          <span className="status-value">{savedTime}</span>
        </div>
      )}

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

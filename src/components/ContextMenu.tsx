import React from 'react';

interface ContextMenuProps {
  type: 'row' | 'col';
  index: number;
  x: number;
  y: number;
  onInsertRow: (index: number) => void;
  onDeleteRow: (index: number) => void;
  onInsertColumn: (index: number) => void;
  onDeleteColumn: (index: number) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  type,
  index,
  x,
  y,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onClose,
}) => {
  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {type === 'row' ? (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              onInsertRow(index);
              onClose();
            }}
          >
            Insert Row Above
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onInsertRow(index + 1);
              onClose();
            }}
          >
            Insert Row Below
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onDeleteRow(index);
              onClose();
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
              onInsertColumn(index);
              onClose();
            }}
          >
            Insert Column Left
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onInsertColumn(index + 1);
              onClose();
            }}
          >
            Insert Column Right
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onDeleteColumn(index);
              onClose();
            }}
          >
            Delete Column
          </div>
        </>
      )}
    </div>
  );
};

import React from 'react';

interface ToolbarProps {
  appVersion: string;
  fileName: string | null;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showFormattingBar: boolean;
  hasSelection: boolean;
  textColor: string;
  backgroundColor: string;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onTextColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onClearTextColor: () => void;
  onClearBackgroundColor: () => void;
  onPanicClose: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  appVersion,
  fileName,
  isDirty,
  canUndo,
  canRedo,
  showFormattingBar,
  hasSelection,
  textColor,
  backgroundColor,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onTextColorChange,
  onBackgroundColorChange,
  onClearTextColor,
  onClearBackgroundColor,
  onPanicClose,
}) => {
  return (
    <div className={`toolbar ${showFormattingBar ? '' : 'toolbar-format-hidden'}`}>
      <div className="toolbar-main">
        <div className="toolbar-title">
          <h1>HolySheet</h1>
          <span className="app-version" title="App version">
            v{appVersion || '0.0.0'}
          </span>
          {fileName && (
            <span className="file-name">
              {fileName}
              {isDirty && <span className="dirty-indicator">*</span>}
            </span>
          )}
        </div>

        <div className="toolbar-actions">
          <button onClick={onNew} title="New (Ctrl+N)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M9 12h6" />
              <path d="M12 9v6" />
              <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" />
            </svg>
            New
          </button>
          <button onClick={onOpen} title="Open (Ctrl+O)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
            </svg>
            Open
          </button>
          <button onClick={onSave} disabled={!isDirty} title="Save (Ctrl+S)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12.5 21h-7.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7.5" />
              <path d="M3 10h18" />
              <path d="M10 3v18" />
              <path d="M19 16v6" />
              <path d="M22 19l-3 3l-3 -3" />
            </svg>
            Save
          </button>
          <button onClick={onSaveAs} title="Save As (Ctrl+Shift+S)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12.5 21h-7.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7.5" />
              <path d="M3 10h18" />
              <path d="M10 3v18" />
              <path d="M19 16v6" />
              <path d="M22 19l-3 3l-3 -3" />
            </svg>
            Save As
          </button>
          <div className="toolbar-separator" />
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1" />
            </svg>
            Undo
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M15 11l4 4l-4 4m4 -4h-11a4 4 0 0 1 0 -8h1" />
            </svg>
            Redo
          </button>
          <div className="toolbar-separator" />
          <button onClick={onPanicClose} className="panic-btn" title="Panic Close (Ctrl+Shift+Q)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
              <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
              <path d="M3 3l18 18" />
            </svg>
            Panic Close
          </button>
        </div>
      </div>

      {showFormattingBar && (
        <div className="toolbar-format-row">
          <div className="format-controls">
            <button onClick={onToggleBold} disabled={!hasSelection} title="Bold (Ctrl+B)">
              B
            </button>
            <button onClick={onToggleItalic} disabled={!hasSelection} title="Italic (Ctrl+I)">
              I
            </button>
            <button onClick={onToggleUnderline} disabled={!hasSelection} title="Underline (Ctrl+U)">
              U
            </button>

            <label className="color-control" title="Text color">
              T
              <input
                type="color"
                value={textColor}
                disabled={!hasSelection}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onTextColorChange(e.target.value)
                }
              />
            </label>
            <button onClick={onClearTextColor} disabled={!hasSelection} title="Clear text color">
              Tx
            </button>

            <label className="color-control" title="Background color">
              Bg
              <input
                type="color"
                value={backgroundColor}
                disabled={!hasSelection}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onBackgroundColorChange(e.target.value)
                }
              />
            </label>
            <button
              onClick={onClearBackgroundColor}
              disabled={!hasSelection}
              title="Clear background color"
            >
              Bx
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface TabStripProps {
  tabs: Array<{ id: string; name: string }>;
  activeTabId: string;
  editingTabId: string | null;
  editingTabName: string;
  canDeleteTab: boolean;
  onSwitchTab: (tabId: string) => void;
  onStartRename: (tabId: string, tabName: string) => void;
  onCommitRename: (tabId: string) => void;
  onCancelRename: () => void;
  onDeleteTab: (tabId: string) => void;
  onAddTab: () => void;
  onEditingNameChange: (name: string) => void;
}

export const TabStrip: React.FC<TabStripProps> = ({
  tabs,
  activeTabId,
  editingTabId,
  editingTabName,
  canDeleteTab,
  onSwitchTab,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDeleteTab,
  onAddTab,
  onEditingNameChange,
}) => {
  return (
    <div className="tab-strip" role="tablist" aria-label="Workbook tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isEditing = tab.id === editingTabId;

        return (
          <div key={tab.id} className={`tab-item ${isActive ? 'active' : ''}`}>
            {isEditing ? (
              <input
                className="tab-name-input"
                value={editingTabName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onBlur={() => onCommitRename(tab.id)}
                onKeyDown={(e) => {
                  if ('Enter' === e.key) {
                    e.preventDefault();
                    onCommitRename(tab.id);
                  }

                  if ('Escape' === e.key) {
                    e.preventDefault();
                    onCancelRename();
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                className="tab-button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSwitchTab(tab.id)}
                onDoubleClick={() => onStartRename(tab.id, tab.name)}
                title={`${tab.name} (double-click to rename)`}
              >
                {tab.name}
              </button>
            )}

            <button
              className="tab-close-button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTab(tab.id);
              }}
              title="Delete tab"
              aria-label={`Delete ${tab.name} tab`}
              disabled={!canDeleteTab}
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        className="tab-add-button"
        onClick={onAddTab}
        title="Add tab"
        aria-label="Add tab"
      >
        +
      </button>
    </div>
  );
};

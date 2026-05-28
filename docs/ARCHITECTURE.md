# Holy Sheet Architecture

## Overview

Holy Sheet is a **privacy-first, portable CSV editor** built on Electron + React + TypeScript.

**Stack:** Electron 35, React 18, TypeScript 5.3, Vite 5, react-window (virtualization)

## Process Architecture

```
┌─────────────────────────────────────────┐
│              Electron Main              │
│  electron/main.ts                       │
│  - Window management                    │
│  - IPC handlers (open/save/export)      │
│  - Encrypted folder guard               │
│  - Portable path redirection            │
│  - Menu bar                             │
│  - Network blocking                     │
└──────────────┬──────────────────────────┘
               │ contextBridge
┌──────────────▼──────────────────────────┐
│           Preload Bridge                │
│  electron/preload.ts                    │
│  - Whitelisted IPC methods              │
│  - Menu event listeners                 │
│  - TypeScript interface exported        │
└──────────────┬──────────────────────────┘
               │ window.electronAPI
┌──────────────▼──────────────────────────┐
│           Renderer (React)              │
│  src/                                   │
│  ├── main.tsx          Entry point      │
│  ├── App.tsx           App shell        │
│  ├── hooks/            Custom hooks     │
│  │   └── useHotkeys.ts                  │
│  ├── components/       UI components    │
│  │   ├── Grid.tsx      Virtual grid     │
│  │   ├── CellRenderer.tsx               │
│  │   ├── Toolbar.tsx                    │
│  │   ├── StatusBar.tsx                  │
│  │   ├── TabStrip.tsx                   │
│  │   ├── ContextMenu.tsx                │
│  │   └── ErrorBoundary.tsx              │
│  ├── state/            State management │
│  │   ├── store.ts      AppState, actions│
│  │   └── undo.ts       UndoStack        │
│  ├── utils/            Utilities        │
│  │   ├── csv/          CSV parse/serialize│
│  │   ├── selection.ts  CellCoord, Range │
│  │   └── fill.ts       Fill operations  │
│  └── ai/               AI module (stub) │
└─────────────────────────────────────────┘
```

## Component Tree

```
<ErrorBoundary>
  <App>
    <Toolbar />        File ops, undo/redo, formatting
    <Grid />           Virtualized spreadsheet
      └── <CellRenderer />  Memoized cell component
    <TabStrip />       Workbook tab management
    <StatusBar />      Cell ref, row/col counts, save state
    <ContextMenu />    Row/col insert/delete
  </App>
</ErrorBoundary>
```

## Data Flow

```
CSV File
  │
  ▼
parseCsv() / parseWorkbook()
  │
  ▼
string[][] (2D array per tab)
  │
  ▼
React state (useAppState)
  │
  ▼
Grid (react-window VirtualGrid)
  │
  ▼
User edits → setCellValue / pasteData / etc.
  │
  ▼
UndoStack (Command pattern)
  │
  ▼
serializeCsv() / serializeWorkbook()
  │
  ▼
CSV File (or #HOLYSHEET_TABS_V1 workbook)
```

## State Model

`AppState` has these key fields:
- `tabs[]`, `activeTabId` — multi-tab workbook
- `data: string[][]` — active tab's 2D grid
- `selectedCell`, `selectedRange`, `editingCell` — selection state
- `isDirty`, `lastSavedAt`, `saveError` — save state
- `canUndo`, `canRedo` — reactive undo state
- `isLoading` — loading indicator

## IPC Channel Reference

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `open-csv` | renderer→main | Open file dialog |
| `open-csv-with-delimiter` | renderer→main | Open with explicit delimiter |
| `save-csv` | renderer→main | Save to known path |
| `save-csv-as` | renderer→main | Save As dialog |
| `export-csv` | renderer→main | Export plain CSV (strip workbook metadata) |
| `confirm-unsaved-changes` | renderer→main | Unsaved changes dialog |
| `panic-close` | renderer→main | Immediate quit |
| `get-portable-info` | renderer→main | Portable mode info |
| `get-app-version` | renderer→main | App version |
| `open-external-url` | renderer→main | Open URL in browser |
| `menu:*` | main→renderer | Menu bar events |

## Workbook Format

Single-tab, no-formatting files are saved as standard CSV.
Multi-tab or formatted files use a custom `#HOLYSHEET_TABS_V1` header format:

```
#HOLYSHEET_TABS_V1
#TAB:Sheet1
#FORMAT:%7B%7D          (URI-encoded JSON)
#WIDTHS:%5B%5D          (URI-encoded JSON array)
<CSV data>
#TAB:Sheet2
...
```

## Key Design Decisions

- **No external state library.** React useState + useCallback is sufficient for this app's complexity.
- **Command pattern for undo.** Each mutation is encapsulated as a Command with execute/undo.
- **Virtualized rendering.** react-window handles large datasets.
- **Offline-first.** No network requests. Network navigation is blocked in main process.
- **Portable mode.** All Electron user data redirected to `.holysheet/` adjacent to the executable.

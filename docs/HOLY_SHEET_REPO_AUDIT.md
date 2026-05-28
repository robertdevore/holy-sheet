# Holy Sheet Repo Audit

**Date:** 2026-05-28
**Auditor:** DeepSeek V4 Pro (automated)
**Version audited:** 0.2.0 (commit on `main`)

## Executive Summary

Holy Sheet is a working, privacy-first, portable CSV editor built on Electron + React + TypeScript. It has a solid privacy/security foundation (encrypted-folder guard, portable mode, no telemetry), working undo/redo via command pattern, multi-tab workbook support, virtualized rendering via `react-window`, and basic formatting (bold/italic/underline/colors). However, it has **zero tests**, **no CLI**, **no AI integration**, **no docs beyond README/QUICKSTART**, and several **CSV correctness gaps**. The UI works but lacks polish in cell editing, copy/paste, drag-and-drop, and selection behavior. The codebase is compact (~540 lines store.ts, ~475 lines csv.ts, ~450 lines App.tsx, ~770 lines Grid.tsx) but could benefit from modest decomposition.

## Verified Current Architecture

- **Framework/runtime:** Electron 35 + React 18 + TypeScript 5.3 + Vite 5
- **Main process:** `electron/main.ts` (~330 lines) — window creation, IPC handlers (open/save/save-as, confirm-unsaved, panic-close, portable-info, open-external-url), encrypted-folder guard, portable path redirection, network blocking
- **Preload bridge:** `electron/preload.ts` (~90 lines) — `contextBridge.exposeInMainWorld('electronAPI', ...)`, strict method allowlist, TypeScript interface exported
- **Renderer/UI:** React 18 SPA via Vite, entry at `src/main.tsx` → `src/App.tsx`
  - Components: `Toolbar.tsx`, `Grid.tsx`, `StatusBar.tsx`
  - All inline SVG icons (no icon library)
  - CSS: single `App.css` (~680 lines), CSS custom properties for theming
- **State management:** `src/state/store.ts` (~540 lines) — React `useState` + `useCallback`, single `AppState` interface, no external state library; undo/redo via `src/state/undo.ts` (~280 lines) Command pattern with max 100-item stack
- **Data/file model:** 2D string arrays (`string[][]`) stored per-tab in `SheetTab` interface, serialized to custom `#HOLYSHEET_TABS_V1` header format or plain CSV
- **CSV parsing/export:** `src/utils/csv.ts` (~475 lines) — custom character-by-character parser (handles quoting, escaping, delimiter detection), serializer with proper quoting, workbook multi-tab format with encoded metadata lines
- **Tests:** **None.** No `*.test.*` files, no `vitest` config, no test scripts in `package.json`
- **Build tooling:** `npm run dev` (Vite only), `npm run electron:dev` (tsc + concurrently Vite + Electron), `npm run build` (tsc electron + vite build + electron-builder + sync:app), `npm run package` (same as build minus sync)

## What Works Today

- Portable/encrypted-folder mode with sentinel guard
- Electron context isolation (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`)
- Network blocking (navigation prevention, window.open denial)
- Open CSV file (auto-detects comma/semicolon/tab delimiters)
- Save / Save As with OS-native dialogs
- Unsaved changes confirmation dialog
- Panic Close (quit without saving)
- Multi-tab workbook (add/rename/delete/switch tabs)
- Cell editing (double-click or Enter to edit, Escape to cancel, Tab/Shift+Tab to navigate)
- Basic keyboard navigation (arrow keys, Home/End, Ctrl+arrow to edges)
- Multi-cell selection via click-drag
- Row/column header click for full row/column selection
- Copy as TSV (Ctrl+C) and Copy as CSV (Ctrl+Shift+C)
- Cut (Ctrl+X) — copies selection then clears
- Paste (Ctrl+V) with multi-cell expansion
- Fill Down (Ctrl+D) and Fill Right (Ctrl+R)
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z) via command pattern
- Row/column insert/delete via keyboard (Ctrl+Plus/Minus) and context menu
- Row/column reorder via drag-and-drop on headers
- Column resize via drag handle
- Virtualized grid rendering via `react-window` `VariableSizeGrid`
- Bold/Italic/Underline formatting (toggle, persisted in workbook format)
- Text color and background color (color picker, persisted)
- URL detection and clickable links in cells
- Go-to-cell (Ctrl+G)
- Formatting bar toggle (Ctrl+Shift+F)
- App version display and macOS traffic light offset
- Column widths persistence in workbook format
- Ragged row normalization on import
- Graceful fallback for legacy CSV files (no workbook header)

## Major Gaps

1. **Zero test coverage.** No unit, integration, or E2E tests exist.
2. **No CLI.** No CLI entrypoint, no agent-safe commands.
3. **No AI integration.** No provider abstraction, no AI settings, no API key handling.
4. **CSV round-trip is lossy.** The custom workbook header format means saving as `.csv` from an unsuspecting app will break the file. Standard CSV round-trip loses formatting, column widths, and tab structure.
5. **Cell editing UX is rough.** Enter commits and moves down (unexpectedly auto-edits the next row). On last row, Enter inserts new row (surprising). No inline formula bar. No visual distinction between navigation mode and edit mode.
6. **Copy/paste is fragile.** Paste splits on commas when no tabs present — corrupts comma-containing cells. No TSV vs CSV paste detection heuristic. No multi-cell range paste from external sources.
7. **Drag-and-drop is janky.** Column reorder uses native HTML5 drag-and-drop but has complex click suppression logic. Row drag visual feedback is absent. No ghost/preview during drag.
8. **No dirty-state visual beyond asterisk.** No unsaved-changes indicator on cells. No save timestamp. No auto-save or recovery.
9. **Performance concerns for very large files.** `handleHotkeys` effect recomputes on every state change (due to deep dependency array). Full `state.data` array is recreated on every paste/undo operation. No debouncing on scroll-synced header transforms.
10. **No accessibility.** No ARIA roles on grid cells beyond tab strip. No screen reader support for cell values. No focus management for context menus.
11. **No settings/preferences UI.** App version hardcoded in React state as fallback `'0.2.0'`. No user-configurable options (font size, theme, default delimiter, etc.).
12. **File overwrite has no safety.** `save-csv` handler does `writeFileSync` without backup, atomic write, or temp-file-and-rename pattern.
13. **No documentation beyond README/QUICKSTART.** No architecture docs, no API docs, no contributor guide.
14. **No linting or formatting config.** No ESLint, no Prettier config in the repo (though `.prettierrc` exists in Strata for comparison — Holy Sheet has none).

## UI/UX Audit

### Cell Editing

- **Works:** Double-click or Enter to start editing. Escape cancels. Tab/Shift+Tab to navigate. Characters typed when cell is selected start editing with that character.
- **Issues:**
  - Enter commits and auto-edits the cell below (unconventional for spreadsheet users who expect Enter to commit and move selection, not re-enter edit mode)
  - Enter on last row auto-inserts new row (surprising — should be explicit)
  - No visual distinction between a cell being "selected" vs "in edit mode" beyond the input field appearing
  - No formula bar / single-line editor at top
  - Cell content can overflow beyond cell width during edit but not during display (truncated with ellipsis — can't see full content without editing)
  - Blur commits the edit unconditionally — no way to click away to cancel

### Keyboard Navigation

- **Works:** Arrow keys navigate. Ctrl+Arrow goes to edges. Home/End for row edges. Tab/Shift+Tab moves right/left. F2 edits active cell.
- **Issues:**
  - Ctrl+A selects all but there's no way to extend selection with Shift+Arrow from keyboard
  - No Page Up/Page Down support
  - No Ctrl+Space (select column) or Shift+Space (select row) shortcuts
  - Delete/Backspace clears selected cells but doesn't move focus

### Copy/Paste

- **Works:** Ctrl+C copies TSV. Ctrl+Shift+C copies CSV. Ctrl+V pastes. Ctrl+X cuts.
- **Issues:**
  - Paste heuristic: if text contains `\t`, splits by tab; otherwise splits by comma. This corrupts data when a single cell is pasted that contains commas (e.g., "San Francisco, CA" becomes two cells)
  - No paste preview or confirmation
  - No "paste special" options (values only, transpose, etc.)
  - Clipboard API used alongside `document.execCommand('copy')` fallback — inconsistent
  - Copy uses event listener approach AND a separate direct clipboard approach in the hotkey handler — double implementation

### Selection Model

- **Works:** Click-drag for range. Click header for full row/col. Ctrl+A for all.
- **Issues:**
  - No Shift+Click to extend selection
  - No Ctrl+Click for disjoint selection
  - No Shift+Arrow to extend from keyboard
  - `selectedRange` and `selectedCell` are somewhat independent — desync possible
  - Ctrl+Shift+A to clear selection doesn't always reset to single cell properly

### Row/Column Controls

- **Works:** Context menu (right-click headers) for insert/delete. Ctrl+Plus/Minus for insert/delete based on selection.
- **Issues:**
  - No toolbar buttons for insert/delete row/column
  - Insert/delete heuristics based on "is full row/col selected" — fragile if grid shape changes
  - No multi-row/column insert
  - No "insert N rows" dialog

### Drag/Drop

- **Works:** Column reorder via drag. Row reorder via drag.
- **Issues:**
  - Column reorder manipulates `columnWidths` array in-place to preserve widths during move — couples width state to order state
  - No visual drag preview/ghost
  - Click suppression logic (`suppressHeaderClick`) is fragile, uses `setTimeout(0)` to reset
  - Drag initiation requires 3px movement threshold — inconsistent feel
  - Drop target doesn't show insertion indicator

### Undo/Redo

- **Works:** Command pattern with max 100-item stack. Supports cell edit, paste, insert/delete row/col, move row/col.
- **Issues:**
  - Undo stack is module-level singleton — not React state, so `canUndo()`/`canRedo()` are function calls, not reactive values (they trigger no re-render when they change)
  - Undo stack is cleared on tab switch, new file, add tab, delete tab — loses history unexpectedly
  - No undo for formatting changes
  - No undo for column resize
  - No undo stack size indicator in UI

### Save/Load Feedback

- **Works:** Asterisk (\*) next to filename when dirty. Save disables button when not dirty.
- **Issues:**
  - No save timestamp
  - No auto-save option
  - No "last saved" indicator
  - Save failure only shows `alert()` — no inline error
  - Open failure is silent (returns null, no error message to user)

### Empty/Error/Loading States

- **Issues:**
  - Empty file opens 20×10 empty grid — no "empty file" message
  - Malformed CSV produces silent data loss (rows with only empty string are dropped)
  - No loading spinner during file open/save
  - No error boundary component
  - No "file not found" or "permission denied" error handling

### Accessibility

- **Issues:**
  - No ARIA grid roles
  - Cells are not focusable via keyboard in a standard way
  - No screen reader announcements for cell values
  - Color-only formatting has no text alternative
  - Context menu has no keyboard activation
  - Tab strip has `role="tablist"` but grid has no `role="grid"`

## CSV/Data Integrity Audit

### CSV Parsing

- **Status:** Custom character-by-character parser. Handles quoted fields, escaped quotes (`""`), and delimiter detection.
- **Issues:**
  - Delimiter detection is naive (counts occurrences in first line only) — fails for files where first line is a header with fewer commas than data lines with multi-line quoted fields
  - No handling of comments (lines starting with `#`)
  - No encoding detection (assumes UTF-8 always)
  - BOM (byte order mark) handling is absent
  - Empty lines within quoted fields are treated as row breaks (parser doesn't track if we're inside quotes across lines — but it actually does handle `\n` inside quotes correctly since the `inQuotes` state persists across characters)
  - **Bug:** The parser drops rows that are a single empty string `['']` (the `!(currentRow.length === 1 && currentRow[0] === '')` check). This means trailing blank lines in CSV files are silently removed.
  - **Bug:** The parser does NOT handle the case where `\r` appears inside a quoted field — it unconditionally ignores `\r`, so `\r\n` inside a quoted cell becomes just `\n`.

### CSV Serialization

- **Status:** Proper quoting of cells containing delimiters, quotes, or newlines. Trims trailing empty rows/columns (but `preserveGridShape` is hardcoded to `true`, so all rows/cols are preserved).
- **Issues:**
  - `preserveGridShape` is always `true` — the dead code for trailing-empty trimming is unreachable
  - Serializer always uses comma delimiter — no way to export as TSV or semicolon
  - No option to strip formatting metadata on export
  - Workbook format serializes formatting as JSON inside `#FORMAT:` lines — these are fragile if CSV is opened in another editor

### Workbook Format

- **Status:** Custom `#HOLYSHEET_TABS_V1` header with `#TAB:`, `#FORMAT:`, `#WIDTHS:` metadata lines.
- **Issues:**
  - Not compatible with any other CSV tool
  - Single-tab, no-formatting files export as plain CSV (good), but any formatting or multi-tab silently switches to proprietary format
  - No version migration strategy
  - Encoding of JSON inside URI-encoded lines is fragile (double-encoding risk)

### Round-Trip Safety

- **Issues:**
  - Plain CSV → Holy Sheet → plain CSV: works for single tab, no formatting
  - Plain CSV → Holy Sheet → workbook format: adds proprietary headers, can't be opened elsewhere
  - Workbook format → Holy Sheet → workbook format: works
  - No round-trip test exists

### Large File Behavior

- **Status:** `react-window` provides row virtualization. Column headers are not virtualized (all rendered). Row headers are all rendered.
- **Issues:**
  - 20k+ row files may strain column header rendering
  - Parsing is synchronous on the main thread — large files will block UI during open
  - No streaming/chunked parsing
  - Grid auto-expands to 20×10 minimum even for legitimately tiny files (e.g., 2×3)

## Performance Audit

### Rendering

- `react-window` `VariableSizeGrid` virtualizes rows — good.
- Column headers are all rendered in DOM (no virtualization) — could be expensive at 1000+ columns.
- Row headers are all rendered in DOM — expensive for 50k+ rows.
- `handleGridScroll` updates React state (`scrollLeft`, `scrollTop`) on every scroll tick, triggering re-renders.
- `columnWidths` state is `useState` in Grid.tsx — separate from persisted widths in store.

### State Updates

- `handleHotkeys` in App.tsx has a deep dependency array including `state.data` — the effect re-registers on every keystroke that changes data.
- Every cell edit creates a full copy of `state.data` (`data.map((r) => [...r])`).
- Paste, undo, and redo all do full data copies.
- No `useMemo` or `React.memo` used anywhere.

### Clipboard

- Large clipboard operations (e.g., select-all + copy on 10k rows) will create a massive string and block the UI.

### File IO

- `fs.readFileSync` and `fs.writeFileSync` are synchronous and block the main process (though for typical CSV sizes this is acceptable).
- No streaming read/write.

### Memory

- Undo stack stores full grid snapshots for paste operations.
- Format data stored as flat `Record<string, CellFormat>` — could be memory-heavy for heavily formatted large grids.

## Modularity and DRY Audit

### Current Module Structure

```
src/
  main.tsx          — entry
  App.tsx           — ~870 lines (app shell, all handlers, hotkeys, context menu, tab strip markup)
  App.css           — ~680 lines (all styles)
  components/
    Grid.tsx        — ~770 lines (virtual grid, cell rendering, edit input, drag/drop, resize, keyboard nav)
    Toolbar.tsx     — ~200 lines (toolbar buttons, formatting bar, color pickers)
    StatusBar.tsx   — ~60 lines (cell ref, row/col counts, portable badge)
  state/
    store.ts        — ~540 lines (all state, all actions, undo integration)
    undo.ts         — ~280 lines (UndoStack class, command factories)
  utils/
    csv.ts          — ~475 lines (parse/serialize/detect/expand)
    selection.ts    — ~120 lines (CellCoord, CellRange, A1 notation, bounds)
```

### Issues

- **App.tsx is too large** (870 lines). It contains: hotkey handling (~200 lines), clipboard logic (~50 lines), selection fill logic (~60 lines), context menu rendering (~70 lines), tab strip rendering (~70 lines), plus all the callback wiring. Should be split into hooks and smaller components.
- **Grid.tsx is too large** (770 lines). Contains: virtual grid setup, cell rendering (inline), edit input handling, drag-and-drop for headers, column resize, keyboard navigation (duplicated from App.tsx in some ways), scroll sync.
- **Keyboard shortcuts are split** between `App.tsx` (global hotkeys like Ctrl+C, Ctrl+V, Ctrl+Z, Enter, Tab) and `Grid.tsx` (navigation arrows, Delete, Backspace, alpha keys for editing). This split is fragile and has led to duplicate logic.
- **Undo stack is a module-level singleton** — not testable, not resettable per-tab cleanly.
- **CSV format logic** mixes parsing, serialization, workbook format, and grid utilities in one file.
- **No separation between** domain logic (CSV model, selection model, undo model) and UI components.

## Security and Local-First Audit

### Strengths

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — proper Electron security
- Preload uses `contextBridge.exposeInMainWorld` with explicit method allowlist
- Network navigation is blocked (`will-navigate` prevented, `setWindowOpenHandler` denies)
- All userData/cache/temp redirected to `.holysheet/` portable directory
- OS recent documents cleared on startup and after file operations
- No telemetry, no crash reporter, no auto-updater
- Panic Close for immediate shutdown without saving

### Issues

- `shell.openExternal` is used for URL opening — validates protocol but does NOT warn user before opening external browser (privacy leak if user unknowingly clicks a URL cell)
- No Content Security Policy (CSP) header set
- `writeFileSync` used without atomic write pattern (no temp file + rename)
- No file permission error handling beyond try/catch with generic error message
- Port 5173 is hardcoded for dev server — potential conflict
- `dialog.showErrorBox` used for sentinel failure — could be used for phishing if app is compromised
- `document.execCommand('copy')` used as fallback — deprecated API
- No `webSecurity` verification in webPreferences (defaults to true, which is fine)
- No integrity checks on loaded files

## CLI Readiness Audit

**Status: No CLI exists.**

Holy Sheet has no CLI entrypoint whatsoever. Contrast with Strata which has a full CLI (`app/cli/`).

### What Would Be Needed (Minimum)

- CLI entrypoint (separate Node.js script or Electron `app.commandLine` integration)
- `health` — verify app can run, portable mode OK
- `csv inspect` — show rows/cols/delimiters without opening GUI
- `csv validate` — validate CSV syntax, report errors
- `csv preview` — output first N rows as JSON/text
- `--json` / `--pretty` output modes
- `--dry-run` for destructive operations
- Deterministic exit codes (0 = success, non-zero = error)
- Stable error shape (JSON with `error`, `code`, `message` fields)
- No destructive writes without `--force` or confirmation

## AI Readiness Audit

**Status: No AI integration exists.**

Holy Sheet has no AI provider abstraction, no API key handling, no AI settings, no prompt templates.

### What Would Be Needed (Minimum)

- Provider abstraction (OpenAI-compatible, Anthropic, local models)
- Secure API key storage (never in logs, never in renderer, never in CSV files)
- AI settings UI (provider selection, model selection, API key entry)
- AI actions limited to proposal, not direct mutation
- Diff/preview before any AI-generated transformation
- Action history and revert/rollback
- Privacy warning before sending any CSV data to external AI
- Local model support consideration
- No AI required for basic CSV operations (must remain fully offline-capable)

## Strata Integration Readiness

**Status: Not ready.**

### Prerequisites Before Strata Integration

- Holy Sheet needs a CLI (for Strata to call)
- Holy Sheet needs a local API or IPC surface Strata can use
- CSV → Markdown note conversion logic
- Markdown note → CSV row conversion logic
- Metadata column conventions (e.g., `_strata_note_id`, `_strata_updated`)
- Round-trip key strategy to avoid duplication
- Token/auth configuration for cross-app communication
- No direct Strata DB access (both apps must communicate via API/CLI)

### Risks

- Holy Sheet's custom workbook format will conflict with round-trip Strata notes
- No ID scheme exists for row-level tracking
- Both apps are local-first — cross-app communication path is undefined

## Documentation Gaps

- No architecture document
- No API/CLI documentation (no CLI exists)
- No contributor guide
- No security model document (though README covers privacy well)
- No changelog
- No test plan
- No keyboard shortcut reference card (README has some but incomplete)

## Test Coverage Gaps

**Current: 0 tests.**

### Critical Test Needs

- CSV parse round-trip (write → read → verify identical)
- Quoted field handling (commas, quotes, newlines inside cells)
- Empty cell handling
- Ragged row normalization
- Delimiter detection (comma, semicolon, tab)
- BOM handling
- Workbook format parse/serialize round-trip
- Undo/redo stack behavior (execute, undo, redo, clear on max size)
- Selection model (range bounds, cell-in-range)
- Copy/paste text generation (TSV and CSV formats)
- A1 notation conversion
- Grid expand logic
- File save → load consistency

## Recommended Cleanup Order

1. **Phase 1: Foundation** — Add ESLint/Prettier, add basic test infrastructure, fix the most glaring bugs
2. **Phase 2: CSV Correctness** — Fix parser bugs, add round-trip tests, separate standard CSV from workbook format more cleanly
3. **Phase 3: UI Polish** — Improve cell editing UX, copy/paste heuristics, selection keyboard behavior, drag-and-drop visual feedback
4. **Phase 4: Performance** — Memoization, debounced scroll, large-column header virtualization, parsing in chunks
5. **Phase 5: CLI Foundation** — Create basic CLI entrypoint with health/inspect/validate commands
6. **Phase 6: AI Readiness** — Provider abstraction, settings UI, API key handling
7. **Phase 7: Strata Readiness** — CLI hardening, cross-app communication design, metadata conventions

## Risks

1. **Custom workbook format lock-in.** The `#HOLYSHEET_TABS_V1` format is proprietary. If the format changes, all existing Holy Sheet files become unreadable.
2. **No test safety net.** Any refactoring risks regressions with no automated detection.
3. **Undo stack fragility.** Module-level singleton with no reactive state means UI can show stale undo/redo availability.
4. **Electron version.** Electron 35 is current but the deprecation of `document.execCommand` and potential Chromium changes could break clipboard fallbacks.
5. **Platform support.** Windows `.portable` target and Linux `.dir` target are configured but likely untested.

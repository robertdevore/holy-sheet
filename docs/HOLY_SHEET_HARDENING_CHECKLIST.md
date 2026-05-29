# Holy Sheet Hardening Checklist

> **How to use:** Work through tasks sequentially within each phase. Tasks marked with dependencies must wait for those dependencies. Each task is designed to be completed in one focused pass by an agent.

---

## Phase 1: Foundation Cleanup

### HS-001: Add ESLint and Prettier configuration

**Status:** Done
**Phase:** Foundation
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** The repo has no linting or formatting config. Consistent code style prevents drift.
**Files likely involved:**

- `package.json` (add devDependencies, scripts)
- (new) `eslint.config.mjs`
- (new) `.prettierrc`
- (new) `.prettierignore`

**Acceptance criteria:**

- [x] ESLint 9+ flat config added with TypeScript + React rules
- [x] Prettier config added (2-space indent, single quotes, trailing commas)
- [x] `npm run lint` and `npm run format` scripts added to `package.json`
- [x] Existing code passes lint with no errors
- [x] `.prettierignore` excludes `dist/`, `dist-electron/`, `release/`, `node_modules/`, `.holysheet/`

**Implementation notes:**
- Installed eslint@9, prettier, eslint-config-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @eslint/js, typescript-eslint.
- Created `eslint.config.mjs` with TS + React hooks + Prettier.
- Created `.prettierrc` and `.prettierignore`.
- Added `lint`, `format`, `format:check` scripts.
- Fixed all lint errors: reordered callbacks (TDZ fix), suppressed intentional setState-in-effect, removed unused catch bindings.
- `npm run lint` — 0 errors, 0 warnings. `npm run format:check` — clean. `npx tsc --noEmit` — clean.

**Suggested test plan:**

- Run `npm run lint` and verify zero errors
- Run `npm run format -- --check` and verify no changes needed

**Notes for implementation agent:**
Holy Sheet uses tabs for indentation in some places — Prettier should be configured for spaces (standard for TypeScript/React projects). Match the existing code style where possible.

---

### HS-002: Add Vitest test infrastructure

**Status:** Done
**Phase:** Foundation
**Size:** M
**Risk:** Low
**Depends on:** HS-001
**Why:** Zero tests exist. Need infrastructure before writing any tests.
**Files likely involved:**

- `package.json` (add devDependencies: `vitest`, `@vitest/ui`, scripts)
- (new) `vitest.config.ts`
- (new) `src/utils/__tests__/` directory
- (new) `src/state/__tests__/` directory

**Acceptance criteria:**

- [ ] `vitest` and `@vitest/ui` added as devDependencies
- [ ] `vitest.config.ts` created with path alias support (`@/` → `./src/`)
- [ ] `npm run test` script runs vitest
- [ ] `npm run test:ui` script opens vitest UI
- [ ] At least one trivial smoke test passes (e.g., `createEmptyGrid` returns correct dimensions)

**Suggested test plan:**

- `npm run test` passes
- `npm run test:ui` opens browser UI

**Notes for implementation agent:**
Configure vitest to use `jsdom` environment for any React component tests later. For now, just infrastructure + one smoke test.

---

### HS-003: Extract keyboard shortcut handler from App.tsx into dedicated hook

**Status:** Done
**Phase:** Foundation
**Size:** M
**Risk:** Medium
**Depends on:** None
**Why:** App.tsx is 870 lines. The ~200-line hotkey handler is the biggest single block. Extracting it makes the component readable and the hotkeys testable.
**Files likely involved:**

- (new) `src/hooks/useHotkeys.ts`
- `src/App.tsx` (import and use new hook, remove inline handler)

**Acceptance criteria:**

- [ ] All existing keyboard shortcuts work identically after extraction
- [ ] New hook accepts all needed state/callbacks as parameters
- [ ] App.tsx reduced by at least 150 lines
- [ ] Hook is independently testable (pure function of state + event)

**Suggested test plan:**

- Manually test: Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Shift+Z, Ctrl+A, Ctrl+F, Ctrl+G, Ctrl+B/I/U, Ctrl+D, Ctrl+R, Ctrl+Plus/Minus, Escape, F2, Enter, Tab, arrow keys
- Verify no regressions in copy/paste, undo/redo, formatting, navigation

**Notes for implementation agent:**
The hook currently re-registers on every `state.data` change due to deep dependency array. Use refs for stable callback references. Be careful with the `editingCell` check — input-focused events should not be captured.

---

### HS-004: Extract context menu rendering from App.tsx into ContextMenu component

**Status:** Done
**Phase:** Foundation
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** Small, self-contained extraction. Improves readability.
**Files likely involved:**

- (new) `src/components/ContextMenu.tsx`
- `src/App.tsx` (import and use new component)

**Acceptance criteria:**

- [ ] Context menu behavior unchanged (right-click row/col header shows insert/delete options)
- [ ] Component accepts `type`, `index`, `x`, `y`, `onInsertRow`, `onInsertColumn`, `onDeleteRow`, `onDeleteColumn`, `onClose`
- [ ] Click-outside-to-close still works

**Suggested test plan:**

- Right-click row header → Insert Row Above/Below, Delete Row appear
- Right-click column header → Insert Column Left/Right, Delete Column appear
- Click outside closes menu
- Selecting an option performs action and closes menu

---

### HS-005: Extract tab strip rendering from App.tsx into TabStrip component

**Status:** Done
**Phase:** Foundation
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Tab strip rendering is ~70 lines of JSX mixed into App.tsx. Clean extraction.
**Files likely involved:**

- (new) `src/components/TabStrip.tsx`
- `src/App.tsx` (import and use new component)

**Acceptance criteria:**

- [ ] Tab strip behavior unchanged (add, switch, rename, delete, close)
- [ ] Double-click to rename works
- [ ] Enter to commit rename, Escape to cancel
- [ ] Delete disabled when only one tab exists
- [ ] Active tab highlighted

**Suggested test plan:**

- Add tab → new tab appears, switches to it
- Switch tab → data changes
- Double-click tab → rename input appears
- Type new name, Enter → tab renamed
- Click × on tab → tab deleted (if > 1 tab)
- Click × on last tab → button disabled

---

### HS-006: Extract selection fill logic from App.tsx into dedicated module

**Status:** Done
**Phase:** Foundation
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Fill Down and Fill Right logic is ~50 lines in App.tsx. Belongs in a utility module.
**Files likely involved:**

- (new) `src/utils/fill.ts`
- `src/App.tsx` (import from new module)

**Acceptance criteria:**

- [ ] `fillDown(data, range)` and `fillRight(data, range)` pure functions
- [ ] Behavior identical: Fill Down copies first row of selection through all rows
- [ ] Behavior identical: Fill Right copies leftmost column of selection through all columns
- [ ] Functions return new data array (immutable)

**Suggested test plan:**

- Select 3×3 range, type "A" in top-left, Ctrl+D → all cells in selection become "A"
- Select 3×3 range, type "B" in leftmost column, Ctrl+R → each row filled with "B"
- Unit test: verify output array shape matches input shape

---

### HS-007: Add React error boundary component

**Status:** Done
**Phase:** Foundation
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** App has no error boundary. A rendering crash in Grid or Toolbar takes down the whole app with a blank screen.
**Files likely involved:**

- (new) `src/components/ErrorBoundary.tsx`
- `src/main.tsx` (wrap App)

**Acceptance criteria:**

- [ ] `ErrorBoundary` class component catches render errors
- [ ] Shows user-friendly error message with "Reload" button
- [ ] Logs error details to console
- [ ] Wraps `<App />` in `main.tsx`

**Suggested test plan:**

- Temporarily throw in Grid render → error boundary shows message instead of white screen
- Click "Reload" → app restarts

---

### HS-008: Normalize module-level undo singleton into React-tracked state

**Status:** Done
**Phase:** Foundation
**Size:** M
**Risk:** Medium
**Depends on:** None
**Why:** The `undoStack` is a module-level singleton. `canUndo()` and `canRedo()` are function calls that don't trigger React re-renders when their return values change. This means the Undo/Redo toolbar buttons can show stale disabled/enabled states.
**Files likely involved:**

- `src/state/store.ts`
- `src/state/undo.ts`

**Acceptance criteria:**

- [ ] Undo/redo availability is tracked in React state
- [ ] Toolbar Undo/Redo buttons reactively enable/disable
- [ ] Undo stack still clears on tab switch, new file, add tab
- [ ] No behavior regression in undo/redo operations

**Suggested test plan:**

- Type in cell, verify Undo button enables immediately
- Press Ctrl+Z, verify Undo button may disable if stack empty
- Press Ctrl+Shift+Z, verify Redo button enables
- Switch tabs, verify both buttons disable (stack cleared)

**Notes for implementation agent:**
Add `canUndo` and `canRedo` as boolean state fields. Update them after every undo stack mutation. The `undoStack` can remain a class instance but needs to signal state changes.

---

### HS-009: Split csv.ts into focused modules

**Status:** Done
**Phase:** Foundation
**Size:** M
**Risk:** Medium
**Depends on:** HS-002 (tests needed to verify no regressions)
**Why:** `csv.ts` at 475 lines mixes parsing, serialization, workbook format, delimiter detection, and grid utilities. Splitting makes each concern testable and maintainable.
**Files likely involved:**

- (new) `src/utils/csv/parse.ts` — `parseCsv`, `detectDelimiter`
- (new) `src/utils/csv/serialize.ts` — `serializeCsv`
- (new) `src/utils/csv/workbook.ts` — `parseWorkbook`, `serializeWorkbook`
- (new) `src/utils/csv/grid.ts` — `createEmptyGrid`, `expandGrid`
- (new) `src/utils/csv/index.ts` — re-exports
- `src/utils/csv.ts` — becomes barrel re-export or is deleted

**Acceptance criteria:**

- [ ] All imports in App.tsx, store.ts updated to new paths
- [ ] All existing behavior preserved
- [ ] At minimum: `parseCsv` and `serializeCsv` tests pass
- [ ] `npm run build` succeeds

**Suggested test plan:**

- Open existing CSV file → parses correctly
- Save file → output matches expected CSV
- Open workbook-format file → parses with tabs, formatting, widths
- Save multi-tab workbook → output contains `#HOLYSHEET_TABS_V1` header

---

## Phase 2: CSV Correctness

### HS-010: Fix CSV parser: don't drop single-empty-cell rows

**Status:** Done
**Phase:** CSV Integrity
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** The parser has a guard `!(currentRow.length === 1 && currentRow[0] === '')` that drops rows containing only one empty cell. This causes data loss when a CSV has intentional blank rows (e.g., section separators).
**Files likely involved:**

- `src/utils/csv.ts` (parseCsv function)

**Acceptance criteria:**

- [ ] Rows with a single empty cell are preserved in the parsed output
- [ ] Trailing completely empty rows (all cells empty, at end of file) are still trimmed
- [ ] Existing tests pass
- [ ] Test added: CSV with intentional blank row between data rows preserves the blank row

**Suggested test plan:**

- Parse: `"a,b,c\n\n1,2,3"` → 3 rows (row 1 is `['','','']`)
- Parse: `"a,b,c\n1,2,3\n\n"` → 2 rows (trailing blank trimmed)

**Notes for implementation agent:**
The fix: track whether a row is at EOF vs mid-file. Only drop empty rows when they're at the very end and the row has zero non-empty cells AND we're at EOF.

---

### HS-011: Fix CSV parser: handle \r inside quoted fields correctly

**Status:** Skipped
**Phase:** CSV Integrity
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** The parser unconditionally skips `\r` characters. Inside a quoted field, `\r\n` should be preserved as `\n` (line break within cell), but the current code strips `\r` always, which is correct for `\r\n` line endings but NOT for standalone `\r` inside a quoted cell.
**Files likely involved:**

- `src/utils/csv.ts` (parseCsv function)

**Acceptance criteria:**

- [ ] `\r\n` sequences are normalized to `\n` when they appear as row separators
- [ ] `\r` inside a quoted field is preserved as-is (or normalized to `\n` per RFC 4180)
- [ ] Test added: cell containing `"line1\r\nline2"` parses correctly

**Suggested test plan:**

- Parse a cell containing `\r\n` within quotes → `\n` in output
- Parse a cell containing standalone `\r` within quotes → preserved

**Notes for implementation agent:**
The current logic `if (char === '\r') continue;` runs outside `inQuotes` check. Move it inside the `!inQuotes` branch, or add `\r` handling inside the `inQuotes` branch.

---

### HS-012: Add BOM (byte order mark) handling to CSV parser

**Status:** Done
**Phase:** CSV Integrity
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** CSV files from Windows/Excel often start with a UTF-8 BOM (`\uFEFF`). The parser currently treats it as part of the first cell value.
**Files likely involved:**

- `src/utils/csv.ts` (parseCsv function)

**Acceptance criteria:**

- [ ] UTF-8 BOM at start of file is stripped before parsing
- [ ] First cell value is not prefixed with `\uFEFF`
- [ ] Test added: file starting with BOM parses correctly

**Suggested test plan:**

- Parse: `\uFEFF"Name,Age\nAlice,30"` → first header cell is "Name" not "\uFEFFName"

---

### HS-013: Add CSV parse → serialize round-trip tests

**Status:** Done
**Phase:** CSV Integrity
**Size:** M
**Risk:** Low
**Depends on:** HS-002, HS-009
**Why:** No round-trip tests exist. Critical for data integrity confidence.
**Files likely involved:**

- (new) `src/utils/csv/__tests__/roundtrip.test.ts`

**Acceptance criteria:**

- [ ] Test: simple CSV (comma delimiter, no special chars) round-trips identically
- [ ] Test: CSV with quoted fields round-trips identically
- [ ] Test: CSV with commas inside quoted cells round-trips
- [ ] Test: CSV with newlines inside quoted cells round-trips
- [ ] Test: CSV with escaped quotes (`""`) inside cells round-trips
- [ ] Test: CSV with semicolon delimiter round-trips (serialized as comma, parsed back correctly)
- [ ] Test: CSV with tab delimiter round-trips
- [ ] Test: empty CSV round-trips (empty string in → empty string out)
- [ ] Test: ragged rows normalized on read, preserved on write

**Suggested test plan:**

- `npm run test` passes all round-trip tests

**Notes for implementation agent:**
Test both `parseCsv` + `serializeCsv` as well as `parseWorkbook` + `serializeWorkbook` for plain single-tab CSVs.

---

### HS-014: Add workbook format round-trip tests

**Status:** Done
**Phase:** CSV Integrity
**Size:** M
**Risk:** Low
**Depends on:** HS-002, HS-009
**Why:** The custom workbook format is critical path — if it breaks, users lose formatting and multi-tab data.
**Files likely involved:**

- (new) `src/utils/csv/__tests__/workbook.test.ts`

**Acceptance criteria:**

- [ ] Test: single tab, no formatting → plain CSV output (no workbook header)
- [ ] Test: single tab, with formatting → workbook format with `#HOLYSHEET_TABS_V1` header
- [ ] Test: multi-tab → workbook format with multiple `#TAB:` sections
- [ ] Test: column widths serialize and deserialize correctly
- [ ] Test: cell formats (bold, italic, underline, colors) serialize and deserialize
- [ ] Test: tab names with special characters (spaces, unicode) round-trip via URI encoding

**Suggested test plan:**

- `npm run test` passes all workbook tests

---

### HS-015: Add delimiter detection edge case tests and hardening

**Status:** Done
**Phase:** CSV Integrity
**Size:** S
**Risk:** Low
**Depends on:** HS-002
**Why:** Delimiter detection uses only the first line. Can fail for files where the header has fewer commas than data.
**Files likely involved:**

- `src/utils/csv.ts` (detectDelimiter, parseCsv)

**Acceptance criteria:**

- [ ] Delimiter detection samples first 5 non-empty lines (not just first line)
- [ ] Lines inside quoted fields are excluded from sampling
- [ ] Test: CSV where first line is a comment-like single-value header
- [ ] Test: TSV file correctly detected as tab-delimited
- [ ] Test: semicolon-delimited file correctly detected
- [ ] Test: comma-delimited file with many commas per line

**Suggested test plan:**

- `npm run test` passes delimiter detection tests

---

### HS-016: Add explicit delimiter selection option for Open dialog

**Status:** Done
**Phase:** CSV Integrity
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Auto-detection can fail. Users need manual override. Currently no way to specify delimiter.
**Files likely involved:**

- `electron/main.ts` (open-csv handler — could add filter or separate menu item)
- `src/App.tsx` (handleOpen)

**Acceptance criteria:**

- [ ] File → Open works as before (auto-detect)
- [ ] Some mechanism to open with explicit delimiter (suggestion: add "Open With Delimiter..." submenu or use a simple prompt)
- [ ] At minimum: comma, semicolon, tab selectable

**Suggested test plan:**

- Open semicolon-delimited file with auto-detect → parses correctly (if detection improved by HS-015)
- Open same file with explicit "semicolon" → parses correctly regardless

---

### HS-017: Add "Export as plain CSV" option (strip workbook metadata)

**Status:** Done
**Phase:** CSV Integrity
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Users who save a formatted or multi-tab workbook get a proprietary format that no other tool can read. They need a way to export clean CSV.
**Files likely involved:**

- `electron/main.ts` (new IPC handler or modify save-csv-as)
- `src/App.tsx` (add menu item or toolbar button)
- `src/utils/csv.ts` (serializeCsv already exists, just needs wiring)

**Acceptance criteria:**

- [ ] "Export as CSV" menu item or button added
- [ ] Exports active tab as standard CSV (no workbook headers, no formatting, no widths)
- [ ] Warns user that formatting and other tabs will be lost
- [ ] File save dialog opens with `.csv` extension

**Suggested test plan:**

- Create multi-tab workbook with formatting
- Export as CSV → output is valid standard CSV with only active tab data
- Open exported CSV in another app → readable

---

## Phase 3: Grid/UI Polish

### HS-018: Fix Enter key behavior: commit edit and move selection, don't auto-edit next cell

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Current behavior: Enter commits the edit AND immediately enters edit mode on the cell below. This is unexpected. Standard spreadsheet behavior: Enter commits and moves selection down (navigation mode), double-click or F2 to edit again.
**Files likely involved:**

- `src/components/Grid.tsx` (edit input onKeyDown handler)
- `src/App.tsx` (handleCellDoubleClick logic)

**Acceptance criteria:**

- [ ] Enter in edit mode: commits value, moves selection down one row, stays in navigation mode (not editing)
- [ ] Shift+Enter in edit mode: commits value, moves selection up one row
- [ ] Enter on last row: does NOT auto-insert new row (defer to explicit insert action)
- [ ] Double-click or F2 still enters edit mode
- [ ] Tab behavior unchanged (commits, moves right, stays in navigation mode)

**Suggested test plan:**

- Edit cell, press Enter → cell commits, selection moves down, cell below is NOT in edit mode
- Press Enter again → selection moves down again
- Double-click → enters edit mode

---

### HS-019: Fix paste heuristics: don't split on comma when data has tabs

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Medium
**Depends on:** None
**Why:** Current paste logic: if text contains `\t`, split by `\t`; otherwise split by `,`. This means pasting "Doe, John" (no tabs) creates two cells. Should prefer TSV format and only fall back to comma splitting when data is clearly multi-column.
**Files likely involved:**

- `src/App.tsx` (pasteTextAtSelection function)

**Acceptance criteria:**

- [ ] Pasting TSV data (tab-separated) works correctly
- [ ] Pasting single-line comma-containing text pastes as ONE cell (e.g., "San Francisco, CA")
- [ ] Pasting multi-line CSV data (with consistent comma counts per line) splits by comma
- [ ] Pasting multi-line data with tabs splits by tab
- [ ] Edge case: single cell containing a tab character preserves the tab
- [ ] Test added for paste heuristics

**Suggested test plan:**

- Copy "hello\tworld" → paste → 2 cells
- Copy "San Francisco, CA" → paste → 1 cell
- Copy "a,b,c\nd,e,f" → paste → 2 rows × 3 cols
- Copy "a\tb\tc\nd\te\tf" → paste → 2 rows × 3 cols

**Notes for implementation agent:**
Heuristic: if ALL rows have the same number of commas AND that number > 0, split by comma. Otherwise, treat as single-cell paste. Tab splitting always takes priority.

---

### HS-020: Unify copy implementation (remove duplicate code paths)

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Copy is implemented twice: once in the `copy` event listener, once in the hotkey handler for Ctrl+C. The hotkey handler writes to clipboard directly AND the event listener also fires — they can conflict.
**Files likely involved:**

- `src/App.tsx` (remove clipboard.writeText from hotkey handler, keep only the event listener)

**Acceptance criteria:**

- [ ] Ctrl+C works identically to before
- [ ] Ctrl+Shift+C (copy as CSV) works identically
- [ ] Only ONE code path handles copy (the `copy` event listener)
- [ ] `document.execCommand('copy')` fallback works on older Electron

**Suggested test plan:**

- Select cells, Ctrl+C → paste into external app → correct TSV
- Select cells, Ctrl+Shift+C → paste into external app → correct CSV

---

### HS-021: Add Shift+Click to extend selection

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Standard spreadsheet behavior. User clicks cell A1, then Shift+clicks cell D4 → range A1:D4 selected.
**Files likely involved:**

- `src/components/Grid.tsx` (handleMouseDown, Cell onClick)
- `src/App.tsx` (handleCellClick)

**Acceptance criteria:**

- [ ] Click cell → single-cell selection
- [ ] Shift+Click another cell → range from original to new cell selected
- [ ] Shift+Click again → range extends to new target
- [ ] Click without Shift → resets to single-cell selection
- [ ] Works with row header clicks (selects full row range)
- [ ] Works with column header clicks (selects full column range)

**Suggested test plan:**

- Click A1, Shift+Click D4 → range A1:D4
- Click A1, Click B2 (no shift) → single cell B2
- Shift+Click D4 → range B2:D4

---

### HS-022: Add Shift+Arrow to extend selection from keyboard

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Standard spreadsheet keyboard behavior. User navigates to a cell, holds Shift, presses arrow keys to extend selection.
**Files likely involved:**

- `src/components/Grid.tsx` (handleKeyDown in the navigation useEffect)

**Acceptance criteria:**

- [ ] Shift+Arrow extends selection in arrow direction
- [ ] Shift+Ctrl+Arrow extends to edge of data region
- [ ] Releasing Shift and pressing arrow collapses back to single cell navigation
- [ ] Visual selection updates in real-time

**Suggested test plan:**

- Click A1, hold Shift, press Right 3 times → A1:D1 selected
- Release Shift, press Down → D2 single cell
- Hold Shift, press Ctrl+Down → D2:D[end] selected

---

### HS-023: Add Ctrl+Space (select column) and Shift+Space (select row) shortcuts

**Status:** Done
**Phase:** UI Polish
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** Standard spreadsheet shortcuts missing. Quick column/row selection without reaching for mouse.
**Files likely involved:**

- `src/App.tsx` or `src/hooks/useHotkeys.ts` (depends on HS-003)

**Acceptance criteria:**

- [ ] Ctrl+Space selects entire column of active cell
- [ ] Shift+Space selects entire row of active cell
- [ ] Works when cell is selected (not editing)
- [ ] Column header highlights when column is selected
- [ ] Row header highlights when row is selected

**Suggested test plan:**

- Click B3, Ctrl+Space → column B selected
- Click B3, Shift+Space → row 3 selected

---

### HS-024: Add Page Up / Page Down navigation

**Status:** Done
**Phase:** UI Polish
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** Basic spreadsheet navigation missing. Large files are painful without it.
**Files likely involved:**

- `src/components/Grid.tsx` (handleKeyDown)

**Acceptance criteria:**

- [ ] Page Down moves selection down by one viewport-height of rows
- [ ] Page Up moves selection up by one viewport-height of rows
- [ ] Column position preserved
- [ ] Grid scrolls to keep selection visible

**Suggested test plan:**

- Open 100-row file, click A1, press Page Down → selection jumps down ~20 rows (visible rows)
- Press Page Up → selection returns near A1

---

### HS-025: Add visual drag preview for row/column reorder

**Status:** Done
**Phase:** UI Polish
**Size:** M
**Risk:** Medium
**Depends on:** None
**Why:** Current drag-and-drop has no visual feedback. User can't tell where the row/column will land.
**Files likely involved:**

- `src/components/Grid.tsx` (drag handlers, render)
- `src/App.css` (drag preview styles)

**Acceptance criteria:**

- [ ] Dragging a row header shows a semi-transparent ghost of the row
- [ ] Drop target shows an insertion line between rows
- [ ] Dragging a column header shows a semi-transparent ghost
- [ ] Drop target shows an insertion line between columns
- [ ] Drag is canceled if dropped outside valid target

**Suggested test plan:**

- Drag row 5 header → see ghost row following cursor, insertion line between rows
- Drop on row 10 → row 5 moves to position 9 (before row 10)
- Drag column C header → insertion line between columns
- Drop outside grid → drag cancels, nothing moves

**Notes for implementation agent:**
HTML5 drag-and-drop API has limited visual customization. Consider using a custom drag layer with `mousemove` tracking instead of native `draggable`. Or use the `dragstart` `setDragImage` with a canvas-generated preview.

---

### HS-026: Fix column reorder width-preservation coupling

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Medium
**Depends on:** None
**Why:** Column reorder manipulates the `columnWidths` array in the drop handler to preserve widths during move. This couples ordering to width state. A column should have a persistent width regardless of its position.
**Files likely involved:**

- `src/components/Grid.tsx` (onDrop handler for column headers)
- `src/state/store.ts` (moveColumn action)

**Acceptance criteria:**

- [ ] Column widths are moved along with column data during reorder
- [ ] `setColumnWidths` is not manually spliced in the drop handler — `onColMove` handles everything
- [ ] Column resize after reorder works correctly
- [ ] Width persistence across save/load works

**Suggested test plan:**

- Resize column A to 200px, column B to 150px
- Drag column A after column B
- Column A (now position 2) should be 200px wide
- Column B (now position 1) should be 150px wide
- Save and reload → widths preserved at new positions

---

### HS-027: Add save timestamp and "last saved" indicator to StatusBar

**Status:** Done
**Phase:** UI Polish
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** User has no feedback on when the file was last saved. Only an asterisk for dirty state.
**Files likely involved:**

- `src/state/store.ts` (add `lastSavedAt` to state)
- `src/components/StatusBar.tsx` (display timestamp)

**Acceptance criteria:**

- [ ] After successful save, status bar shows "Saved at [time]" or "Saved just now"
- [ ] Timestamp clears on new edit (returns to showing dirty indicator)
- [ ] "Last saved: [timestamp]" shown even when not dirty

**Suggested test plan:**

- Open file → status shows no save time initially
- Edit cell → asterisk appears
- Save → asterisk disappears, "Saved at HH:MM:SS" appears
- Edit again → asterisk returns, timestamp remains

---

### HS-028: Add save error inline feedback (replace alert())

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Save failures currently use `alert()` which is jarring and blocks UI. Should show inline error in StatusBar or a toast.
**Files likely involved:**

- `src/App.tsx` (handleSave, handleSaveAs)
- `src/components/StatusBar.tsx` (error display)

**Acceptance criteria:**

- [ ] Save failure shows error message in status bar (red text)
- [ ] Error auto-dismisses after 5 seconds or on next action
- [ ] Error message is descriptive (not just "Failed to save")
- [ ] No `alert()` calls remain for operational errors

**Suggested test plan:**

- Make file read-only, try to save → red error in status bar
- Fix permissions, save again → error clears, save succeeds

---

### HS-029: Add loading spinner during file open/save operations

**Status:** Done
**Phase:** UI Polish
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** No visual feedback during potentially slow file operations. User may think app is frozen.
**Files likely involved:**

- `src/state/store.ts` (add `isLoading` state)
- `src/App.tsx` (set loading during open/save)
- `src/components/StatusBar.tsx` or new spinner component

**Acceptance criteria:**

- [ ] Loading spinner or progress indicator shown during file open
- [ ] Loading spinner shown during file save (for large files)
- [ ] Spinner clears when operation completes
- [ ] Grid is not interactive during load (or shows skeleton)

**Suggested test plan:**

- Open large CSV file → spinner visible during parse
- Save large CSV → spinner visible during write
- Operation completes → spinner disappears

---

### HS-030: Add empty state message for new/empty files

**Status:** Done
**Phase:** UI Polish
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** Opening an empty file shows a 20×10 empty grid with no indication that the file was empty. User may think data was lost.
**Files likely involved:**

- `src/components/Grid.tsx` or `src/App.tsx`

**Acceptance criteria:**

- [ ] Opening a truly empty file shows "This CSV file is empty. Start typing to add data." message
- [ ] The empty grid is still interactive (user can type)
- [ ] Message disappears once any cell has content
- [ ] Empty state is visually distinct from populated grid

**Suggested test plan:**

- Open empty CSV file → empty state message visible
- Type in cell → message disappears
- Clear all cells in new file → message reappears

---

### HS-031: Add ARIA grid roles and basic screen reader support

**Status:** Done
**Phase:** UI Polish
**Size:** M
**Risk:** Low
**Depends on:** None
**Why:** Zero accessibility. Grid is completely invisible to screen readers.
**Files likely involved:**

- `src/components/Grid.tsx` (Cell render, grid container, headers)

**Acceptance criteria:**

- [ ] Grid container has `role="grid"` and `aria-label`
- [ ] Row headers have `role="rowheader"` and `aria-label` with row number
- [ ] Column headers have `role="columnheader"` and `aria-label` with column letter
- [ ] Cells have `role="gridcell"` and `aria-label` with cell reference and value
- [ ] Selected cell has `aria-selected="true"`
- [ ] Editing cell has `aria-readonly="false"` (others `aria-readonly="true"`)
- [ ] Tab strip has working `role="tablist"`, `role="tab"` (already partially done)

**Suggested test plan:**

- Use macOS VoiceOver or NVDA to navigate grid
- Verify cell values are announced
- Verify selection state is announced

---

## Phase 4: Performance

### HS-032: Add React.memo to Cell renderer component

**Status:** Done
**Phase:** Performance
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Every cell re-renders on any state change. For large grids, this is expensive. `react-window` already virtualizes row rendering, but memoizing individual cells prevents wasted re-renders within visible rows.
**Files likely involved:**

- `src/components/Grid.tsx` (extract Cell to a `React.memo` component)

**Acceptance criteria:**

- [ ] Cell extracted as `const Cell = React.memo(...)` with explicit prop comparison
- [ ] Cells only re-render when their value, format, or selection state changes
- [ ] No visual regressions in selection highlighting, formatting, or editing
- [ ] Performance improvement measurable with React DevTools profiler

**Suggested test plan:**

- Open 1000-row file
- Type in one cell → only that cell re-renders (verify via React DevTools)
- Select range → only affected cells re-render

**Notes for implementation agent:**
The Cell currently is a closure inside Grid that captures many variables. Extract it to a separate component that receives only needed props. Use `React.memo` with a custom comparator that checks `value`, `isSelected`, `isInRange`, `format`, `isEditing`.

---

### HS-033: Add useMemo for derived selection values

**Status:** Done
**Phase:** Performance
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** `selectionBounds`, `isFullRowSelection`, `isFullColSelection`, `totalColumnWidth`, and `getRangeBounds` calls are recomputed on every render.
**Files likely involved:**

- `src/components/Grid.tsx`

**Acceptance criteria:**

- [ ] `selectionBounds` computed via `useMemo`
- [ ] `isFullRowSelection` and `isFullColSelection` memoized
- [ ] `totalColumnWidth` memoized
- [ ] No behavior changes

**Suggested test plan:**

- Verify selection highlighting works identically
- Verify full row/col selection highlights headers correctly

---

### HS-034: Debounce scroll-to-header sync

**Status:** Done
**Phase:** Performance
**Size:** XS
**Risk:** Low
**Depends on:** None
**Why:** `handleGridScroll` updates `scrollLeft` and `scrollTop` React state on every scroll event tick, causing re-renders at 60fps for header position sync. Headers can use CSS transform directly without React state.
**Files likely involved:**

- `src/components/Grid.tsx`

**Acceptance criteria:**

- [ ] Header scroll sync uses CSS transform updated via ref, not React state
- [ ] Scroll performance improved (less jank on rapid scrolling)
- [ ] Headers stay perfectly aligned with grid content

**Suggested test plan:**

- Scroll rapidly in 5000-row file → headers stay locked, no visible lag
- Resize window → headers reposition correctly

**Notes for implementation agent:**
Use a ref on the header container and directly set `style.transform` in the `onScroll` callback (which is already a callback, not a state setter — actually the current code IS setting state: `setScrollLeft(scrollLeft)`. Change to ref-based direct DOM manipulation.)

---

### HS-035: Add column header virtualization for wide files

**Status:** Done
**Phase:** Performance
**Size:** M
**Risk:** Medium
**Depends on:** None
**Why:** Column headers are rendered for ALL columns regardless of visibility. A file with 1000+ columns renders 1000 header divs.
**Files likely involved:**

- `src/components/Grid.tsx`

**Acceptance criteria:**

- [ ] Only visible column headers (+ small buffer) are rendered
- [ ] Scrolling horizontally shows/hides headers correctly
- [ ] Column resize handles still work
- [ ] Column drag-and-drop still works

**Suggested test plan:**

- Create/load file with 500 columns
- Scroll horizontally → headers appear/disappear correctly
- Resize column → works
- Drag column → works

**Notes for implementation agent:**
Compute visible column range from `scrollLeft` and `gridSize.width`. Only render headers within `[visibleStart - 2, visibleEnd + 2]`. This is the same pattern `react-window` uses for rows.

---

### HS-036: Add row header virtualization for tall files

**Status:** Done
**Phase:** Performance
**Size:** S
**Risk:** Low
**Depends on:** HS-034 (complements scroll refactor)
**Why:** Row headers are rendered for ALL rows. A file with 50k rows renders 50k header divs, which is expensive.
**Files likely involved:**

- `src/components/Grid.tsx`

**Acceptance criteria:**

- [ ] Only visible row headers (+ small buffer) are rendered
- [ ] Scrolling vertically shows/hides headers correctly
- [ ] Row numbers remain correct
- [ ] Row drag-and-drop, context menu still work

**Suggested test plan:**

- Load 50k-row file → DOM has ~30 row headers (not 50k)
- Scroll down → row numbers update correctly
- Right-click row header → context menu works

---

### HS-037: Optimize paste undo data capture for large pastes

**Status:** Done
**Phase:** Performance
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** `createPasteCommand` captures old values by iterating every cell in the paste range. For a select-all paste on a large grid, this creates a huge undo snapshot.
**Files likely involved:**

- `src/state/undo.ts` (createPasteCommand)

**Acceptance criteria:**

- [ ] Paste undo captures old values only for cells that actually changed
- [ ] Memory usage for large paste undo is reduced
- [ ] Undo still correctly restores old values

**Suggested test plan:**

- Paste 1000-row data over existing 1000-row data → undo stack memory is proportional to changed cells, not all cells
- Undo → all cells restore correctly

---

### HS-038: Add useCallback stability for hotkey handler dependencies

**Status:** Done
**Phase:** Performance
**Size:** S
**Risk:** Medium
**Depends on:** HS-003 (hotkey extraction may already address this)
**Why:** The hotkey `useEffect` in App.tsx depends on many callbacks including `state.data`. This causes the effect to re-register on every keystroke that changes data.
**Files likely involved:**

- `src/hooks/useHotkeys.ts` (or `src/App.tsx` if not yet extracted)

**Acceptance criteria:**

- [ ] Hotkey handler uses refs for all state dependencies
- [ ] Effect only registers once (plus cleanup on unmount)
- [ ] All hotkeys work correctly regardless of state staleness concerns

**Suggested test plan:**

- Open file, type rapidly → hotkeys still work
- Check React DevTools profiler → hotkey effect doesn't re-run on every keystroke

**Notes for implementation agent:**
Store `state.data`, `state.selectedCell`, `state.selectedRange`, `state.editingCell`, and all callbacks in refs. Read from refs inside the event handler. Update refs in a passive effect.

---

## Phase 5: CLI Foundation

### HS-039: Create CLI entrypoint script

**Status:** Done
**Phase:** CLI
**Size:** M
**Risk:** Medium
**Depends on:** HS-009 (csv module split helps)
**Why:** No CLI exists. An agent-safe CLI is required for Strata integration and standalone scriptability.
**Files likely involved:**

- (new) `cli/holysheet-cli.ts` or `scripts/holysheet-cli.ts`
- `package.json` (add `bin` field or script)
- `tsconfig.cli.json` (or reuse electron tsconfig)

**Acceptance criteria:**

- [ ] CLI script can be run via `npx tsx cli/holysheet-cli.ts <command>`
- [ ] `--help` shows available commands
- [ ] `--version` shows version
- [ ] Exit code 0 on success, non-zero on error
- [ ] No Electron dependency for basic commands (CSV parsing only)

**Suggested test plan:**

- `npx tsx cli/holysheet-cli.ts --help` → usage text
- `npx tsx cli/holysheet-cli.ts --version` → "0.2.0"

**Notes for implementation agent:**
The CLI should NOT require Electron to start. CSV parsing utilities should work standalone. Use `commander` or `yargs` for argument parsing, or keep it simple with manual argv parsing.

---

### HS-040: Add `health` CLI command

**Status:** Done
**Phase:** CLI
**Size:** XS
**Risk:** Low
**Depends on:** HS-039
**Why:** Quick check that CLI is functional. Useful for agent pre-flight checks.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `health` command outputs JSON: `{"status":"ok","version":"0.2.0"}`
- [ ] `health --pretty` outputs formatted version
- [ ] Exit code 0

**Suggested test plan:**

- `npx tsx cli/holysheet-cli.ts health` → `{"status":"ok","version":"0.2.0"}`

---

### HS-041: Add `csv inspect` CLI command

**Status:** Done
**Phase:** CLI
**Size:** M
**Risk:** Low
**Depends on:** HS-009, HS-039
**Why:** Quick CSV file inspection without opening GUI. Shows rows, columns, delimiter, headers.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `csv inspect <file>` outputs JSON with: `file`, `delimiter`, `rowCount`, `colCount`, `headers` (first row), `sampleRows` (first 5 data rows)
- [ ] `--json` flag (default for agent mode)
- [ ] `--pretty` flag for human-readable table output
- [ ] Detects delimiter automatically
- [ ] Handles file-not-found with clear error

**Suggested test plan:**

- `npx tsx cli/holysheet-cli.ts csv inspect test.csv --json` → valid JSON with correct metadata
- `npx tsx cli/holysheet-cli.ts csv inspect test.csv --pretty` → readable table

---

### HS-042: Add `csv validate` CLI command

**Status:** Done
**Phase:** CLI
**Size:** M
**Risk:** Low
**Depends on:** HS-009, HS-039
**Why:** Validate CSV syntax without opening GUI. Report errors with line numbers.
**Files likely involved:**

- `cli/holysheet-cli.ts`
- `src/utils/csv.ts` (may need a validate function or reuse parseCsv with error collection)

**Acceptance criteria:**

- [ ] `csv validate <file>` returns JSON with `valid` (boolean) and `errors` (array of `{line, col, message}`)
- [ ] Detects: unclosed quotes, inconsistent column counts, encoding issues
- [ ] `--json` flag
- [ ] Exit code 0 if valid, 1 if errors found
- [ ] Handles file-not-found

**Suggested test plan:**

- Valid CSV → `{"valid":true,"errors":[]}`, exit 0
- CSV with unclosed quote → `{"valid":false,"errors":[{"line":3,"col":5,"message":"Unclosed quote"}]}`, exit 1

---

### HS-043: Add `csv preview` CLI command

**Status:** Done
**Phase:** CLI
**Size:** S
**Risk:** Low
**Depends on:** HS-009, HS-039
**Why:** Quick data preview without opening GUI. Outputs first N rows as JSON or table.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `csv preview <file>` outputs first 10 rows as JSON array of arrays
- [ ] `--rows N` flag to control row count
- [ ] `--json` and `--pretty` flags
- [ ] `--columns "A,C,E"` flag to filter columns

**Suggested test plan:**

- `csv preview test.csv --rows 5 --json` → 5 rows of data
- `csv preview test.csv --pretty` → formatted table

---

### HS-044: Add `csv normalize` CLI command (dry-run first)

**Status:** Done
**Phase:** CLI
**Size:** M
**Risk:** Medium
**Depends on:** HS-009, HS-039
**Why:** Normalize CSV (consistent quoting, consistent columns, trim whitespace). Must default to dry-run.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `csv normalize <file>` defaults to dry-run (outputs what WOULD change)
- [ ] `--write` flag to actually write changes
- [ ] `--output <path>` flag to write to new file
- [ ] Normalizations: consistent quoting, trailing whitespace trim, ragged row padding
- [ ] `--json` output for agent consumption

**Suggested test plan:**

- `csv normalize test.csv --dry-run` → shows diff without modifying file
- `csv normalize test.csv --output normalized.csv` → writes normalized file, original unchanged

---

### HS-045: Standardize CLI error shape

**Status:** Done
**Phase:** CLI
**Size:** S
**Risk:** Low
**Depends on:** HS-039
**Why:** Need consistent error format for agent consumption.
**Files likely involved:**

- `cli/holysheet-cli.ts`
- (new) `cli/lib/errors.ts`

**Acceptance criteria:**

- [ ] All errors output as `{"error":"MESSAGE","code":"ERROR_CODE","details":{}}` in JSON mode
- [ ] Standard error codes: `FILE_NOT_FOUND`, `PARSE_ERROR`, `INVALID_ARGS`, `PERMISSION_DENIED`
- [ ] Exit codes: 0=success, 1=user error, 2=system error
- [ ] `--json` flag triggers JSON error output; without it, human-readable errors

**Suggested test plan:**

- `csv inspect nonexistent.csv --json` → `{"error":"File not found","code":"FILE_NOT_FOUND","details":{"path":"nonexistent.csv"}}`, exit 1

---

## Phase 6: AI Readiness

### HS-046: Add AI settings/config infrastructure

**Status:** Done
**Phase:** AI Readiness
**Size:** M
**Risk:** Low
**Depends on:** None
**Why:** No settings exist at all. Need a foundation before adding AI settings.
**Files likely involved:**

- (new) `src/state/settings.ts` or extend `store.ts`
- (new) `src/components/SettingsModal.tsx`
- `electron/main.ts` (IPC for settings persistence)
- `electron/preload.ts` (expose settings IPC)

**Acceptance criteria:**

- [ ] Settings stored in `.holysheet/userData/settings.json`
- [ ] Settings include: AI provider, API key (encrypted or stored in OS keychain), model, temperature
- [ ] Settings UI accessible from toolbar or menu
- [ ] Settings persist across app restarts
- [ ] API key never exposed to renderer logs or devtools

**Suggested test plan:**

- Open settings, configure AI provider
- Close and reopen app → settings preserved
- Check `.holysheet/userData/settings.json` → settings present

**Notes for implementation agent:**
API key handling is the most sensitive part. Consider using Electron's `safeStorage` API for encryption at rest. Never send API key to renderer process — keep it in main process and only use it server-side.

---

### HS-047: Create AI provider abstraction

**Status:** Done
**Phase:** AI Readiness
**Size:** M
**Risk:** Low
**Depends on:** HS-046
**Why:** Need a clean provider abstraction before any AI features. Holy Sheet should support OpenAI-compatible APIs and local models.
**Files likely involved:**

- (new) `src/ai/providers/provider.ts` (interface)
- (new) `src/ai/providers/openai-compatible.ts`
- (new) `src/ai/providers/local.ts` (stub for Ollama/LM Studio)

**Acceptance criteria:**

- [ ] `AIProvider` interface: `chat(messages, options) → Promise<AIResponse>`
- [ ] `AIResponse` type: `{ content: string, usage?: { promptTokens, completionTokens } }`
- [ ] OpenAI-compatible provider implemented
- [ ] Provider reads config from settings
- [ ] Provider does NOT depend on Electron (pure TypeScript for CLI use)
- [ ] Errors surfaced clearly (no silent failures)

**Suggested test plan:**

- Unit test with mock HTTP client
- Manual test with real API key (if available)

---

### HS-048: Add AI prompt templates for CSV operations

**Status:** Done
**Phase:** AI Readiness
**Size:** S
**Risk:** Low
**Depends on:** HS-047
**Why:** Standardized prompts for common CSV tasks: summarize, clean, validate, transform, describe.
**Files likely involved:**

- (new) `src/ai/prompts/csv-prompts.ts`

**Acceptance criteria:**

- [ ] `summarize` prompt template: describes columns, row count, data types, value ranges
- [ ] `clean` prompt template: suggests normalization, dedup, whitespace fixes
- [ ] `validate` prompt template: checks for data quality issues
- [ ] `transform` prompt template: accepts natural language transformation description
- [ ] All prompts include data sample, not full dataset
- [ ] Prompts include instruction to only return structured JSON

**Suggested test plan:**

- Verify prompt templates produce valid JSON when AI responds
- Verify data is truncated to ~20 rows in prompts (never full dataset)

---

### HS-049: Add AI action proposal → preview → apply flow scaffolding

**Status:** Done
**Phase:** AI Readiness
**Size:** M
**Risk:** Medium
**Depends on:** HS-047, HS-048
**Why:** AI should never directly mutate data. Must show proposal first, let user preview, then apply.
**Files likely involved:**

- (new) `src/ai/actions/types.ts`
- (new) `src/ai/actions/proposalEngine.ts`
- `src/components/` (new AI panel component)

**Acceptance criteria:**

- [ ] AI response parsed into structured action proposals
- [ ] Each proposal has: `type` (e.g., `replace_cells`, `add_row`, `delete_column`), `before`, `after`, `description`
- [ ] Preview shows diff of proposed changes
- [ ] User can accept/reject individual proposals or all
- [ ] Applied actions go through undo stack
- [ ] NO automatic application of AI output

**Suggested test plan:**

- Mock AI response with cell replacements
- Verify preview renders correctly
- Accept → data changes, undo available
- Reject → nothing changes

---

### HS-050: Add privacy warning before sending data to AI

**Status:** Done
**Phase:** AI Readiness
**Size:** S
**Risk:** Medium
**Depends on:** HS-046
**Why:** Sending CSV data to external AI providers is a privacy concern. Users must explicitly consent.
**Files likely involved:**

- `src/components/` (privacy consent dialog or setting)
- `src/state/settings.ts`

**Acceptance criteria:**

- [ ] First AI use shows privacy warning: "Your CSV data will be sent to [provider]. Ensure you have permission."
- [ ] User must explicitly enable "Allow AI data sharing" in settings
- [ ] Setting is OFF by default
- [ ] Warning re-shown if provider changes
- [ ] Option to set row limit for AI context

**Suggested test plan:**

- Enable AI in settings
- First AI operation → privacy dialog appears
- Accept → operation proceeds
- Change provider → dialog re-appears

---

## Phase 7: Strata Readiness

### HS-051: Add `strata note import` CLI command (stub)

**Status:** Done
**Phase:** Strata Readiness
**Size:** M
**Risk:** Medium
**Depends on:** HS-039 (CLI foundation)
**Why:** Future integration with Strata. Stub this out now so the architecture is prepared.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `strata note import <note.json>` command accepts Strata note export JSON
- [ ] Converts Markdown content to a single-row CSV with columns: `title`, `content`, `tags`, `created`, `strata_note_id`
- [ ] `--output <file.csv>` writes CSV file
- [ ] `--dry-run` prints what would be created
- [ ] Handles missing fields gracefully
- [ ] Does NOT access Strata DB directly

**Suggested test plan:**

- Create mock Strata note JSON
- `strata note import note.json --output test.csv` → valid CSV with note data

**Notes for implementation agent:**
This is a stub. Full integration design comes later. Just prove the data path works.

---

### HS-052: Add `strata note export` CLI command (stub)

**Status:** Done
**Phase:** Strata Readiness
**Size:** M
**Risk:** Medium
**Depends on:** HS-039
**Why:** Reverse direction: export CSV rows as Strata-compatible note payloads.
**Files likely involved:**

- `cli/holysheet-cli.ts`

**Acceptance criteria:**

- [ ] `strata note export <file.csv>` command reads CSV
- [ ] Each row becomes a Markdown note with frontmatter (title from first column or header)
- [ ] Output as JSON array of Strata note payloads
- [ ] `--row N` flag to export specific row
- [ ] `--json` output for piping to Strata API
- [ ] Does NOT write to Strata DB directly

**Suggested test plan:**

- `strata note export test.csv --json` → valid Strata note JSON array

---

### HS-053: Add `_strata_note_id` column convention to store model

**Status:** Done
**Phase:** Strata Readiness
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Need a standard way to track which Strata note a CSV row corresponds to. Add metadata column support.
**Files likely involved:**

- `src/state/store.ts` (add metadata column awareness)
- `src/utils/csv.ts` (skip metadata columns on export or mark them)

**Acceptance criteria:**

- [ ] Columns prefixed with `_strata_` are treated as metadata (hidden by default in UI, preserved in save)
- [ ] `_strata_note_id` column stores the Strata note UUID
- [ ] `_strata_updated` column stores last sync timestamp
- [ ] Metadata columns don't interfere with normal CSV operations
- [ ] Export as plain CSV excludes metadata columns by default (option to include)

**Suggested test plan:**

- Create CSV with `_strata_note_id` column
- Verify column is visually distinguished or hidden
- Save and reload → metadata preserved
- Export plain CSV → metadata excluded

---

### HS-054: Design and document Strata ↔ Holy Sheet data contract

**Status:** Done
**Phase:** Strata Readiness
**Size:** S
**Risk:** Low
**Depends on:** HS-051, HS-052, HS-053
**Why:** Both apps need a shared understanding of data shapes before integration can proceed.
**Files likely involved:**

- (new) `docs/STRATA_INTEGRATION_CONTRACT.md`

**Acceptance criteria:**

- [ ] Document specifies: note → CSV mapping, CSV → note mapping
- [ ] Document specifies: metadata column conventions
- [ ] Document specifies: round-trip key strategy
- [ ] Document specifies: conflict resolution approach
- [ ] Document specifies: authentication/authorization model
- [ ] Document specifies: error handling contract

**Suggested test plan:**

- Review document for completeness
- Verify mappings are bidirectional (note → CSV → note preserves all meaningful data)

---

## Phase 8: Docs & Tests

### HS-055: Add keyboard shortcut reference to README

**Status:** Done
**Phase:** Docs
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** README lists some shortcuts but is incomplete. Users need a comprehensive reference.
**Files likely involved:**

- `README.md`

**Acceptance criteria:**

- [ ] Complete keyboard shortcut table added to README
- [ ] Categorized: Navigation, Editing, Selection, Formatting, File Operations, Clipboard, Advanced
- [ ] macOS and Windows/Linux modifiers shown (Cmd vs Ctrl)
- [ ] All shortcuts verified to actually work

**Suggested test plan:**

- Test each shortcut in the table
- Verify no undocumented shortcuts are missing

---

### HS-056: Add CONTRIBUTING.md

**Status:** Done
**Phase:** Docs
**Size:** S
**Risk:** Low
**Depends on:** HS-001
**Why:** No contributor guide. Developers need setup instructions, code style rules, and PR process.
**Files likely involved:**

- (new) `CONTRIBUTING.md`

**Acceptance criteria:**

- [ ] Development setup instructions (clone, npm install, npm run electron:dev)
- [ ] Code style rules (reference ESLint/Prettier config)
- [ ] How to run tests
- [ ] How to build
- [ ] PR process (branch naming, commit style)
- [ ] Architecture overview with links to audit doc

---

### HS-057: Add ARCHITECTURE.md

**Status:** Done
**Phase:** Docs
**Size:** S
**Risk:** Low
**Depends on:** None
**Why:** Developers need to understand the app structure quickly.
**Files likely involved:**

- (new) `docs/ARCHITECTURE.md`

**Acceptance criteria:**

- [ ] Diagram or description of Electron main → preload → renderer flow
- [ ] Component tree (App → Toolbar, Grid, StatusBar, TabStrip)
- [ ] State management overview (useAppState, UndoStack)
- [ ] Data flow: CSV file → parse → grid → serialize → file
- [ ] IPC channel list
- [ ] Build pipeline description

---

### HS-058: Add unit tests for CSV parse/export utilities

**Status:** Done
**Phase:** Tests
**Size:** M
**Risk:** Low
**Depends on:** HS-002, HS-013 (round-trip tests are the same set)
**Why:** Core data integrity. Without these tests, any parser change risks data corruption.
**Files likely involved:**

- `src/utils/csv/__tests__/parse.test.ts`
- `src/utils/csv/__tests__/serialize.test.ts`

**Acceptance criteria:**

- [ ] `parseCsv`: basic comma CSV, semicolon, tab, quoted fields, escaped quotes, newlines in cells, empty cells, BOM, ragged rows, empty input
- [ ] `detectDelimiter`: comma, semicolon, tab, ambiguous, single-column
- [ ] `serializeCsv`: basic data, quoted fields, commas in cells, newlines in cells, empty cells
- [ ] `createEmptyGrid`: default dimensions, custom dimensions
- [ ] `expandGrid`: row expansion, column expansion, both

**Suggested test plan:**

- `npm run test` passes all csv tests

---

### HS-059: Add unit tests for selection utilities

**Status:** Done
**Phase:** Tests
**Size:** S
**Risk:** Low
**Depends on:** HS-002
**Why:** Selection logic is critical for copy, paste, fill, insert/delete operations.
**Files likely involved:**

- `src/utils/__tests__/selection.test.ts`

**Acceptance criteria:**

- [ ] `colIndexToLetter`: 0→A, 25→Z, 26→AA, 701→ZZ, 702→AAA
- [ ] `letterToColIndex`: A→0, Z→25, AA→26
- [ ] `coordToA1`: {row:0,col:0}→"A1", {row:9,col:2}→"C10"
- [ ] `a1ToCoord`: "A1"→{row:0,col:0}, "C10"→{row:9,col:2}, invalid→null
- [ ] `getRangeBounds`: single cell, multi-cell, reversed start/end
- [ ] `isCellInRange`: inside, outside, on boundary
- [ ] `getCellsInRange`: correct count, correct order
- [ ] `formatRangeSize`: "1 cell", "3x2", "1x5"

---

### HS-060: Add unit tests for undo/redo stack

**Status:** Done
**Phase:** Tests
**Size:** M
**Risk:** Low
**Depends on:** HS-002
**Why:** Undo is a critical feature. Stack behavior must be verified.
**Files likely involved:**

- `src/state/__tests__/undo.test.ts`

**Acceptance criteria:**

- [ ] `UndoStack`: execute adds command, undo reverses, redo re-applies
- [ ] Multiple undos and redos
- [ ] New execute clears redo stack
- [ ] Max stack size (100) enforced (oldest removed)
- [ ] `createCellEditCommand`: execute changes cell, undo restores
- [ ] `createPasteCommand`: captures old values, undo restores them
- [ ] `createInsertRowCommand`: execute inserts row, undo removes it
- [ ] `createDeleteRowCommand`: execute deletes row, undo restores it
- [ ] `createInsertColumnCommand`: execute inserts column, undo removes it
- [ ] `createDeleteColumnCommand`: execute deletes column, undo restores it
- [ ] `createMoveRowCommand`: execute moves row, undo restores order
- [ ] `createMoveColumnCommand`: execute moves column, undo restores order

---

### HS-061: Add unit tests for paste text parsing heuristics

**Status:** Done
**Phase:** Tests
**Size:** S
**Risk:** Low
**Depends on:** HS-002, HS-019 (updated heuristics)
**Why:** Paste is a common operation and the heuristics have been buggy.
**Files likely involved:**

- (new) `src/utils/__tests__/paste.test.ts` (or inline in App test)

**Acceptance criteria:**

- [ ] Single cell with comma → 1 cell (not split)
- [ ] TSV data → correct 2D split
- [ ] CSV data with consistent commas → correct 2D split
- [ ] Mixed tabs and commas → tabs win
- [ ] Empty string → no-op
- [ ] Newline-only → no-op
- [ ] Trailing empty rows stripped

---

## Summary Statistics

| Phase            | Task Count |
| ---------------- | ---------- |
| Foundation       | 9          |
| CSV Integrity    | 8          |
| UI Polish        | 14         |
| Performance      | 7          |
| CLI              | 7          |
| AI Readiness     | 5          |
| Strata Readiness | 4          |
| Docs & Tests     | 7          |
| **Total**        | **61**     |

## Sequencing Recommendation

1. **First session:** HS-001, HS-002, HS-003, HS-007 (foundation)
2. **Second session:** HS-010, HS-011, HS-012, HS-013, HS-015 (CSV correctness + tests)
3. **Third session:** HS-018, HS-019, HS-021, HS-022 (critical UX fixes)
4. **Fourth session:** HS-032, HS-033, HS-034 (performance quick wins)
5. **Continue:** Phase order with dependency awareness

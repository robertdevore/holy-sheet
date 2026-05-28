# Holy Sheet Agent Handoff

**Date:** 2026-05-28
**Prepared by:** DeepSeek V4 Pro (audit pass)
**For:** Next implementation agent

## Current Repo State

Holy Sheet v0.2.0 is a **working** privacy-first CSV editor built on Electron 35 + React 18 + TypeScript 5.3 + Vite 5. It has:

- ✅ Solid Electron security (context isolation, sandbox, no node integration)
- ✅ Portable/encrypted-folder mode with sentinel guard
- ✅ Virtualized grid rendering (`react-window`)
- ✅ Undo/redo via command pattern
- ✅ Multi-tab workbook support
- ✅ Basic formatting (bold/italic/underline/colors)
- ✅ Working CSV open/save with delimiter detection
- ✅ Row/column insert/delete, reorder, resize

It does NOT have:

- ❌ Any tests (zero)
- ❌ Any CLI
- ❌ Any AI integration
- ❌ ESLint/Prettier config
- ❌ Error boundaries
- ❌ Accessibility (ARIA)
- ❌ Settings/preferences UI
- ❌ Architecture/contributor docs

The codebase is compact: 5 main source files (~2,750 lines total). It's well-organized for its size but needs decomposition before it grows further.

## What To Do First

The first 5 tasks that will make the biggest difference:

1. **HS-001** — Add ESLint and Prettier. Code quality foundation.
2. **HS-002** — Add Vitest test infrastructure + one smoke test.
3. **HS-007** — Add React error boundary. Prevents white-screen crashes.
4. **HS-003** — Extract hotkey handler from App.tsx. App.tsx is 870 lines.
5. **HS-010** — Fix CSV parser dropping single-empty-cell rows. Data integrity.

## What Not To Do Yet

- **Do not build Strata integration.** This audit is preparation only.
- **Do not add AI write access** before diff/preview/history exists.
- **Do not rewrite the whole app.** Incremental, task-by-task improvement.
- **Do not introduce direct DB coupling with Strata.**
- **Do not bypass safe file handling.** No `writeFileSync` without backup pattern.
- **Do not change the workbook format** (`#HOLYSHEET_TABS_V1`) without a migration strategy.
- **Do not remove the encrypted-folder guard** or portable mode.
- **Do not add network requests** — Holy Sheet is offline-first by design.

## Architecture Rules To Preserve

- **Local-first.** All data stays on disk. No cloud sync.
- **Holy Sheet works independently.** No dependency on Strata or any other app.
- **File operations must be safe.** Prefer write-to-new-file. Atomic writes (temp + rename) for overwrites.
- **Agent workflows go through CLI/API surfaces.** Never direct DB/filesystem access from external tools.
- **AI proposes transformations, never applies them directly.** Diff → preview → user confirmation → apply.
- **Privacy-first.** No telemetry, no crash reporting, no auto-updater, no recent files.
- **Portable mode is required in production.** Sentinel file guard must remain.

## Recommended Work Loop

For each checklist task:

1. **Pick one task** from `docs/HOLY_SHEET_HARDENING_CHECKLIST.md`
2. **Read the files** listed in "Files likely involved"
3. **Make the smallest safe change** that satisfies the acceptance criteria
4. **Add or update tests** as specified
5. **Run checks:**
   ```bash
   npm run lint        # after HS-001
   npm run test        # after HS-002
   npm run build       # verify build still works
   npm run electron:dev  # manual smoke test if UI change
   ```
6. **Update checklist status** — change `**Status:** Todo` to `**Status:** Done` and add a note about what changed
7. **Report:** List changed files, test results, and any issues encountered

## First Implementation Slice

The best single session of work after this audit:

1. **HS-001** — Add ESLint + Prettier (30 min)
2. **HS-002** — Add Vitest + one smoke test (30 min)
3. **HS-007** — Add error boundary (15 min)
4. **HS-010** — Fix CSV parser blank-row bug (15 min)
5. **HS-011** — Fix `\r` inside quoted fields (10 min)
6. **HS-012** — Add BOM handling (10 min)

**Total:** ~2 hours. Outcome: linted code, test infrastructure, one bug fix, basic crash protection.

## Key Files Reference

| File                           | Lines | Purpose                                 |
| ------------------------------ | ----- | --------------------------------------- |
| `electron/main.ts`             | ~330  | Window, IPC, portable mode, security    |
| `electron/preload.ts`          | ~90   | Context bridge API                      |
| `src/main.tsx`                 | ~9    | React entry                             |
| `src/App.tsx`                  | ~870  | App shell, handlers, hotkeys, tabs      |
| `src/App.css`                  | ~680  | All styles                              |
| `src/components/Grid.tsx`      | ~770  | Virtual grid, cells, editing, drag/drop |
| `src/components/Toolbar.tsx`   | ~200  | Toolbar buttons, formatting bar         |
| `src/components/StatusBar.tsx` | ~60   | Cell ref, row/col counts                |
| `src/state/store.ts`           | ~540  | State, actions, undo integration        |
| `src/state/undo.ts`            | ~280  | UndoStack class, command factories      |
| `src/utils/csv.ts`             | ~475  | Parse, serialize, workbook, grid utils  |
| `src/utils/selection.ts`       | ~120  | CellCoord, CellRange, A1 notation       |

## IPC Channel Reference

| Channel                               | Direction     | Purpose                                                   |
| ------------------------------------- | ------------- | --------------------------------------------------------- |
| `open-csv`                            | renderer→main | Open file dialog, returns `{path, content, name}`         |
| `save-csv`                            | renderer→main | Save to known path, returns `{success, error?}`           |
| `save-csv-as`                         | renderer→main | Save As dialog, returns `{success, path?, name?, error?}` |
| `confirm-unsaved-changes`             | renderer→main | Dialog: Save/Don't Save/Cancel                            |
| `panic-close`                         | renderer→main | Immediate quit without save                               |
| `get-portable-info`                   | renderer→main | Returns `{isPortable, portablePath, isDev}`               |
| `get-app-version`                     | renderer→main | Returns version string                                    |
| `open-external-url`                   | renderer→main | Open URL in default browser                               |
| `menu:new/open/save/saveAs/undo/redo` | main→renderer | Menu bar click events                                     |

## Build Commands

```bash
npm run dev            # Vite dev server only (no Electron)
npm run electron:dev   # Full dev mode (Electron + Vite)
npm run build          # Production build (tsc + vite + electron-builder)
npm run package        # Same as build (alias)
npm run open:release   # Launch built app
```

## Notes

- The undo stack is a module-level singleton in `undo.ts`. This means `canUndo()` / `canRedo()` calls don't trigger React re-renders. Toolbar buttons may show stale state. HS-008 addresses this.
- Column widths are coupled to column order during drag-and-drop reorder. HS-026 addresses this.
- The `preserveGridShape` variable in `serializeCsv` is hardcoded to `true` — trailing empty row/col trimming code is dead.
- The app has no `docs/` directory convention. The three docs created by this audit establish one.
- Electron `sandbox: true` means the preload script runs in a sandboxed environment. This is correct for security but means no Node.js APIs in preload.
- For CLI work (Phase 5), the CLI script should NOT import Electron. CSV utilities in `src/utils/csv.ts` are pure TypeScript and work standalone.
- The `#HOLYSHEET_TABS_V1` format is a single-header-line marker for workbook files. Plain CSV files (single tab, no formatting) are saved as standard CSV without this header.

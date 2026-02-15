# HolySheet

A privacy-first, portable CSV editor for desktop. HolySheet is designed to run entirely from an encrypted folder, leaving no traces outside your secure environment.

## Overview

HolySheet is a minimal, offline, single-user CSV editor that feels like a tiny Google Sheets, but ONLY for editing raw CSV data (strings/numbers) - no formulas, no cloud sync, no telemetry.

**Key Features:**
- ✅ Clean, spreadsheet-like grid interface
- ✅ Open/Edit/Save CSV files
- ✅ Advanced keyboard workflow (select all, cut/copy/paste, fill, go-to-cell)
- ✅ Copy as TSV or CSV from selected ranges
- ✅ Undo/redo operations
- ✅ Insert/delete rows and columns
- ✅ Virtualized rendering for large files (20k+ rows)
- ✅ **100% offline** - no network calls
- ✅ **Portable mode** - all data stays in your encrypted folder
- ✅ **Privacy-first** - no logs, no telemetry, no recent files tracking

**What HolySheet is NOT:**
- ❌ No formulas, functions, or calculations
- ❌ No charts, pivot tables, or multi-sheet workbooks
- ❌ No cloud sync or collaboration features
- ❌ No auto-updater or crash reporting
- ❌ No background services

## Privacy & Security Model

### Encrypted Folder Operation

HolySheet is designed to run from (and store everything inside) an encrypted folder that you mount/unmount manually.

**Operational Flow:**
1. Mount your encrypted volume (e.g., VeraCrypt, Cryptomator, APFS encrypted, etc.)
2. Launch HolySheet from within the mounted path
3. Work with your CSV files (all stored in the encrypted volume)
4. Close HolySheet
5. Unmount the encrypted volume

When unmounted, HolySheet leaves no recoverable traces outside the encrypted folder.

### Privacy Guarantees

✅ **What HolySheet DOES:**
- Redirects ALL Electron userData/cache/temp to `.holysheet/` folder next to the executable
- Clears OS recent documents list on startup and after file operations
- Stores undo/redo history only in memory (never persisted)
- Validates it's running from an encrypted folder (sentinel file check)
- Provides "Panic Close" feature for immediate shutdown without saving

❌ **What HolySheet DOES NOT:**
- Make any network requests (no update checks, no telemetry)
- Write logs outside the portable folder
- Maintain a "recent files" list
- Auto-save or create backup files
- Store your file paths persistently

### Known Limitations

⚠️ HolySheet cannot prevent all OS-level traces:
- **Swap/page files**: OS may swap RAM to disk (use encrypted swap or disable swap)
- **Filesystem journaling**: Some filesystems log operations
- **Window server snapshots**: macOS/Windows may cache window previews
- **Thumbnail caches**: OS may create previews (HolySheet tries to prevent this)

**Recommendation:** For maximum security, ensure your entire system drive is encrypted and use HolySheet only within a separately encrypted container.

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- An encrypted folder/volume (VeraCrypt, Cryptomator, APFS encrypted, etc.)

### Development Mode

1. **Clone/download** this repository into your encrypted folder:
   ```bash
   cd /path/to/your/encrypted/folder
   git clone <repo-url> holysheet
   cd holysheet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ensure sentinel file exists** (auto-created in dev mode):
   ```bash
   # The file HOLYSHEET_PORTABLE.txt should exist in the root
   ls -la HOLYSHEET_PORTABLE.txt
   ```

4. **Run in development mode:**
   ```bash
   npm run electron:dev
   ```

### Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

   (You can also use `npm run package`; both produce distributable output in `release/`.)

2. **Locate the built app** in `release/` folder

3. **Move the entire app** into your encrypted folder:
   ```bash
   cp -r release/HolySheet.app /path/to/encrypted/folder/
   ```

4. **Create sentinel file** in the same directory as the app:
   ```bash
   # macOS/Linux
   cd /path/to/encrypted/folder
   echo "HolySheet portable mode enabled" > HOLYSHEET_PORTABLE.txt

   # Windows
   cd C:\path\to\encrypted\folder
   echo HolySheet portable mode enabled > HOLYSHEET_PORTABLE.txt
   ```

5. **Launch the app** - it will create a `.holysheet/` folder next to itself for all data.

### Encrypted Folder Guard

On startup, HolySheet checks for the sentinel file (`HOLYSHEET_PORTABLE.txt`) in the app launch directory. If not found, the app refuses to run and shows an error:

> "HolySheet must be run from within your encrypted folder. Move the app into your encrypted folder and create a file named HOLYSHEET_PORTABLE.txt"

This ensures you never accidentally run HolySheet from an unencrypted location.

In packaged macOS builds, this means the file should be placed in the same folder that contains `HolySheet.app` (not inside the `.app` bundle).

## Usage

### Opening CSV Files

- **Menu:** File → Open (Cmd/Ctrl+O)
- **Toolbar:** Click "Open" button
- Supports comma, semicolon, and tab-delimited files
- Auto-detects delimiter (or defaults to comma)

### Editing Cells

- **Click** a cell to select it
- **Double-click** or press **Enter** to edit
- **F2** edits the active cell
- **Tab** moves right, **Shift+Tab** moves left
- **Enter** commits the edit
- **Esc** cancels editing
- **Arrow keys** navigate the grid

### Selection

- **Click and drag** to select multiple cells
- **Cmd/Ctrl+A** selects the full grid
- **Cmd/Ctrl+Shift+A** or **Esc** clears multi-cell selection back to active cell
- **Click a row header** to select the full row
- **Click a column header** to select the full column
- Selected cells show blue highlight

### Copy & Paste

- **Copy:** Cmd/Ctrl+C (TSV - tab-separated values)
- **Copy as CSV:** Cmd/Ctrl+Shift+C (comma-separated output)
- **Cut:** Cmd/Ctrl+X (copies selection, then clears selected cells)
- **Paste:** Cmd/Ctrl+V (accepts TSV/CSV text)
- **Paste Values:** Cmd/Ctrl+Shift+V (same as paste in this version)
- Multi-cell paste automatically expands grid if needed
- Paste fills from active cell across/down

### Fill Commands

- **Fill Down:** Cmd/Ctrl+D (fills selection with the first selected row)
- **Fill Right:** Cmd/Ctrl+R (fills selection with the left-most selected column)

### Row & Column Operations

**Right-click** on row/column headers for context menu:
- Insert Row Above/Below
- Delete Row
- Insert Column Left/Right
- Delete Column

**Column resizing:**
- Drag the divider at the right edge of any column header

**Keyboard (when full row/column is selected):**
- **Insert:** Cmd/Ctrl++
- **Delete:** Cmd/Ctrl+-

### Undo & Redo

- **Undo:** Cmd/Ctrl+Z
- **Redo:** Cmd/Ctrl+Shift+Z
- Supports all operations: edits, paste, row/column changes
- Stack limit: 100 operations (memory-only, not persisted)

### Saving

- **Save:** Cmd/Ctrl+S (overwrites current file)
- **Save As:** Cmd/Ctrl+Shift+S (prompts for new location)
- Saves as UTF-8 encoded CSV
- Properly quotes fields containing commas, quotes, or newlines

### New File

- **Menu:** File → New (Cmd/Ctrl+N)
- Creates empty 20x10 grid
- Prompts to save if current file has unsaved changes

### Navigation

- **Go to Cell:** Cmd/Ctrl+G (A1 format, e.g. `B12`)
- **Home/End:** jump to first/last column in current row
- **Cmd/Ctrl+Arrow:** jump to grid boundaries

### Panic Close

- **Keyboard:** Cmd/Ctrl+Shift+Q
- **Toolbar:** Red "Panic Close" button
- **Immediately:**
  - Quits without saving
  - Clears in-memory state
  - Destroys window
  - No prompts or confirmations

Use this feature if you need to close HolySheet instantly (e.g., someone enters the room).

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New | Cmd+N | Ctrl+N |
| Open | Cmd+O | Ctrl+O |
| Save | Cmd+S | Ctrl+S |
| Save As | Cmd+Shift+S | Ctrl+Shift+S |
| Undo | Cmd+Z | Ctrl+Z |
| Redo | Cmd+Shift+Z | Ctrl+Shift+Z (or Ctrl+Y) |
| Select All | Cmd+A | Ctrl+A |
| Clear Multi-Selection | Cmd+Shift+A | Ctrl+Shift+A |
| Copy | Cmd+C | Ctrl+C |
| Copy as CSV | Cmd+Shift+C | Ctrl+Shift+C |
| Cut | Cmd+X | Ctrl+X |
| Paste | Cmd+V | Ctrl+V |
| Paste Values | Cmd+Shift+V | Ctrl+Shift+V |
| Fill Down | Cmd+D | Ctrl+D |
| Fill Right | Cmd+R | Ctrl+R |
| Insert Row/Column* | Cmd++ | Ctrl++ |
| Delete Row/Column* | Cmd+- | Ctrl+- |
| Go to Cell | Cmd+G | Ctrl+G |
| Panic Close | Cmd+Shift+Q | Ctrl+Shift+Q |
| Navigate | Arrow Keys | Arrow Keys |
| Jump to Boundary | Cmd/Ctrl + Arrow Keys | Ctrl + Arrow Keys |
| Row Start/End | Home / End | Home / End |
| Edit Cell | Enter or F2 | Enter or F2 |
| Cancel Edit | Esc | Esc |
| Move Right | Tab | Tab |
| Move Left | Shift+Tab | Shift+Tab |
| Clear Cell(s) | Delete/Backspace | Delete/Backspace |

\* Insert/Delete shortcut applies when a full row or full column selection is active.

## CSV Parsing Rules

### Delimiter Detection

HolySheet auto-detects the delimiter by analyzing the first line:
- Counts occurrences of comma (`,`), semicolon (`;`), and tab (`\t`)
- Uses the delimiter with the most occurrences
- Falls back to comma if ambiguous

### Quoting Rules

**On Import:**
- Quoted fields can contain delimiters, newlines, and quotes
- Quotes inside quoted fields must be doubled (`""`)
- Example: `"Hello ""World"""` → `Hello "World"`

**On Export:**
- Fields containing delimiter, quotes, or newlines are quoted
- Quotes are escaped by doubling
- Example: `Hello, "World"` → `"Hello, ""World"""`

### Special Cases

- **Empty file:** Creates 20x10 default grid
- **Ragged rows:** Normalizes to maximum column count (fills with empty strings)
- **Trailing newline:** Ignored if it doesn't contain data
- **Line breaks in fields:** Preserved within quoted fields

## Performance

HolySheet uses virtualized rendering (react-window) to handle large files efficiently.

**Tested Performance:**
- ✅ 20,000 rows x 30 columns: Smooth scrolling and editing
- ✅ 50,000 rows x 20 columns: Usable (some lag on initial load)
- ⚠️ 100,000+ rows: May experience slowdowns

For very large CSVs (100k+ rows), consider:
- Splitting into smaller files
- Using specialized tools (pandas, CSVkit, etc.)

## Project Structure

```
holysheet/
├── electron/              # Electron main process
│   ├── main.ts           # App lifecycle, portable mode, IPC
│   └── preload.ts        # IPC bridge (contextBridge API)
├── src/                  # React renderer
│   ├── components/
│   │   ├── Grid.tsx      # Virtualized grid with edit/select
│   │   ├── Toolbar.tsx   # Top action bar
│   │   └── StatusBar.tsx # Bottom status info
│   ├── state/
│   │   ├── store.ts      # App state management
│   │   └── undo.ts       # Undo/redo command stack
│   ├── utils/
│   │   ├── csv.ts        # Parse/serialize CSV
│   │   ├── selection.ts  # Cell coords, A1 notation
│   │   └── coords.ts     # Coordinate helpers
│   ├── App.tsx           # Main app component
│   ├── App.css           # Styles
│   └── main.tsx          # React entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── HOLYSHEET_PORTABLE.txt # Sentinel file
```

## Security Best Practices

1. **Always run from encrypted folder:** Never launch HolySheet from an unencrypted location
2. **Verify sentinel file:** Ensure `HOLYSHEET_PORTABLE.txt` exists next to the app
3. **Check portable badge:** Status bar shows "Portable" when running correctly
4. **Encrypt system drive:** For maximum protection, use full-disk encryption (FileVault, BitLocker, LUKS)
5. **Disable swap (optional):** Prevents sensitive data from being paged to disk
6. **Use Panic Close:** If you need to close instantly without traces
7. **Unmount after use:** Always unmount your encrypted volume when done

## File Locations

When running in portable mode, HolySheet stores all data in:

```
/path/to/encrypted/folder/
├── HolySheet.app         # (or HolySheet.exe on Windows)
├── HOLYSHEET_PORTABLE.txt # Sentinel file
└── .holysheet/           # All app data lives here
    ├── userData/         # Electron user data
    ├── cache/            # Cache files
    ├── temp/             # Temporary files
    └── session/          # Session data
```

**Never** store CSV files outside your encrypted folder.

## Troubleshooting

### "HolySheet must be run from within your encrypted folder"

**Solution:** Create the sentinel file:
```bash
echo "HolySheet portable mode enabled" > HOLYSHEET_PORTABLE.txt
```
Place it next to the app launch target.
On macOS, place it in the same folder as `HolySheet.app` (not inside the bundle).
On Windows/Linux, place it in the same folder as the executable.

### Changes not saving

- Check file permissions in your encrypted folder
- Ensure the volume is mounted read-write (not read-only)
- Look for error messages in the app (alerts will show save failures)

### Poor performance with large files

- Reduce grid size (delete unused rows/columns)
- Close other applications to free RAM
- Consider splitting large CSVs into smaller chunks

### Grid not updating after paste

- Ensure you're not in edit mode (press Esc first)
- Select a single cell before pasting
- Check clipboard contains TSV/CSV text (not binary data)

## Development

### Tech Stack

- **Electron** 28.x - Desktop framework
- **React** 18.x - UI library
- **TypeScript** 5.x - Type safety
- **Vite** 5.x - Fast bundler
- **react-window** - Virtualized grid rendering

### Scripts

```bash
npm run dev              # Vite dev server only
npm run electron:dev     # Full Electron + Vite dev mode
npm run electron:build   # Build Electron main + renderer
npm run package          # Create distributable app in release/
npm run build            # Build + package (same final output location)
```

### Architecture

- **Main process** (`electron/main.ts`): Manages app lifecycle, file I/O, portable paths
- **Renderer process** (`src/`): React UI, grid rendering, state management
- **IPC bridge** (`electron/preload.ts`): Secure communication between main/renderer
- **Context isolation**: Enabled (renderer cannot access Node.js directly)

## Manual Testing Checklist

- [ ] App starts only when sentinel file present
- [ ] Portable badge shows in status bar
- [ ] Open CSV file loads correctly
- [ ] Edit cells and values update
- [ ] Undo/redo works for edits
- [ ] Copy single cell to clipboard
- [ ] Copy multi-cell range as TSV
- [ ] Paste TSV data expands grid
- [ ] Insert row above/below
- [ ] Delete row
- [ ] Insert column left/right
- [ ] Delete column
- [ ] Save overwrites file correctly
- [ ] Save As creates new file
- [ ] New file clears grid
- [ ] Unsaved changes prompt on quit
- [ ] Panic Close quits immediately
- [ ] No network requests (check dev tools)
- [ ] All data in `.holysheet/` folder
- [ ] Recent documents cleared (check OS recent files)

## Contributing

HolySheet is privacy-focused by design. If you'd like to contribute:

1. **No telemetry/analytics:** Never add network calls
2. **No external dependencies** that phone home
3. **Preserve portability:** All state must stay in `.holysheet/` folder
4. **Test privacy features:** Verify no traces outside encrypted folder
5. **Document changes:** Update README for user-facing changes

## License

MIT License - See LICENSE file for details.

## Acknowledgements

- Built with [Electron](https://www.electronjs.org/)
- Grid virtualization by [react-window](https://github.com/bvaughn/react-window)
- Inspired by the need for privacy-first productivity tools

---

**Remember:** HolySheet is a tool for privacy-conscious users. Always verify you're running from an encrypted location and practice good security hygiene. No software can protect you from all threats - combine HolySheet with full-disk encryption, secure passwords, and safe computing practices.

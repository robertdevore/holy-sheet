# HolySheet Quick Start

## For Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run in dev mode:

   ```bash
   npm run electron:dev
   ```

3. The app will launch with dev tools open. Create/edit CSV files.

## For Production

1. Build the app:

   ```bash
   npm run build
   ```

   (`npm run package` is also supported and produces the same release output.)

2. Find the built app in `release/` folder

3. Move to your encrypted folder:
   - Copy the entire app to your encrypted volume
   - Create `HOLYSHEET_PORTABLE.txt` file next to the app launch target
   - On macOS, place the sentinel in the same folder as `HolySheet.app` (not inside the `.app` bundle)
   - Launch and verify "Portable" badge appears

## Quick Test

1. Click "New" to create empty grid
2. Type in cells, press Enter to confirm
3. Click "Save As" to save CSV
4. Close and reopen file to verify

## Need Help?

See the full README.md for:

- Complete feature list
- Privacy & security details
- Keyboard shortcuts
- Troubleshooting

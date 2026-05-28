# Strata ↔ Holy Sheet Integration Contract

**Status:** Draft — implementation pending (Phase 7 stubs in place)

## Principles

- Both apps remain **independent** and **local-first**.
- Communication happens through **CLI commands** and **file exchange** (JSON/CSV).
- Neither app accesses the other's database or internal storage directly.
- Data round-trips must preserve all meaningful content.

## Note → CSV Mapping

When a Strata note is imported into Holy Sheet:

| Strata Field | CSV Column | Notes |
|---|---|---|
| `id` | `_strata_note_id` | Metadata column; hidden by default in UI |
| `title` | `title` | Derived from first Markdown heading, or filename |
| `content` | `content` | Full Markdown body |
| `tags` | `tags` | Semicolon-separated |
| `createdAt` | `created` | ISO 8601 string |
| `updatedAt` | `_strata_updated` | Metadata column |

### Metadata Column Convention

Columns prefixed with `_strata_` are treated as metadata:
- Hidden by default in the grid UI
- Preserved in `.holysheet` workbook format
- Excluded from plain CSV export by default (option to include)

## CSV → Note Mapping

When a CSV row is exported to a Strata note:

| CSV Column | Strata Field | Notes |
|---|---|---|
| `_strata_note_id` | `id` | Used for round-trip dedup |
| `title` | `title` | First line of note |
| `content` | `content` | Markdown body |
| `tags` | `tags` | Split by semicolon |
| Any other column | Appended to `content` as Markdown table row | |

## CLI Interface

```bash
# Import a Strata note JSON export into CSV
npx tsx cli/holysheet-cli.ts strata import <note.json> [output.csv]

# Export CSV rows as Strata note JSON payloads
npx tsx cli/holysheet-cli.ts strata export <file.csv> [row_index]

# Pipe to Strata's REST API
npx tsx cli/holysheet-cli.ts strata export data.csv | \
  while read note; do
    curl -X POST http://127.0.0.1:3939/notes -H "Content-Type: application/json" -d "$note"
  done
```

## Round-Trip Key Strategy

- `_strata_note_id` uniquely identifies a Strata note.
- On import: if a row has a `_strata_note_id`, it can be matched to an existing note.
- On export: rows with `_strata_note_id` produce note payloads with that ID (update existing).
- Rows without `_strata_note_id` produce new note payloads.

## Conflict Resolution

When both Strata and Holy Sheet have modified the same data:
1. Last-write-wins with user confirmation
2. Timestamp comparison via `_strata_updated`
3. User is shown a diff before overwriting

## Authentication

- Strata's REST API uses `X-Strata-Token` header or `Authorization: Bearer` token.
- Holy Sheet's CLI reads the token from `STRATA_API_TOKEN` environment variable.
- Token is never stored in CSV files or Holy Sheet's portable data directory.

## Error Handling

- CLI exits with code 1 for user errors (file not found, parse error), 2 for system errors.
- All CLI output is JSON with `error`, `code`, and optional `details` fields.
- Strata API errors (4xx/5xx) are surfaced with the original status code and message.

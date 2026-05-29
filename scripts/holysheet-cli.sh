#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# holysheet-cli — CLI helper for Holy Sheet from any agent or terminal
# =============================================================================
#
# Usage:
#   holysheet-cli health
#   holysheet-cli csv inspect ./data.csv --json
#   holysheet-cli csv validate ./data.csv
#   holysheet-cli csv preview ./data.csv --rows 20
#   holysheet-cli csv select ./data.csv --columns name,email --out ./selected.csv
#   holysheet-cli strata import-notes --from-api --query "meeting notes" --out ./notes.csv
#   holysheet-cli strata export-notes ./tasks.csv --title-column title --out ./task-notes.json
#
# Environment:
#   HOLYSHEET_CLI_OUTPUT       values: pretty | json (default: pretty)
#   HOLYSHEET_CLI_DRY_RUN      values: true | false
#   HOLYSHEET_CLI_AGENT_MODE   values: true | false
#   STRATA_API_BASE_URL        default: http://127.0.0.1:3939
#   STRATA_API_TOKEN           optional auth token for Strata
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Run the TypeScript CLI via tsx
exec npx tsx "$PROJECT_DIR/cli/holysheet-cli.ts" "$@"

# Contributing to Holy Sheet

## Development Setup

```bash
git clone <repo-url> holysheet
cd holysheet
npm install
npm run electron:dev
```

The app launches with dev tools open. Create/edit CSV files to test.

## Code Style

- **TypeScript** throughout (strict mode)
- **React 18** with functional components and hooks
- **ESLint** (flat config) + **Prettier** enforced
- Run `npm run lint` and `npm run format` before committing

## Running Tests

```bash
npm run test          # Run all tests
npm run test:ui       # Open Vitest UI
npm run test:watch    # Watch mode
```

## Building

```bash
npm run build         # Production build (tsc + vite + electron-builder)
npm run open:release  # Launch built app
```

## Project Structure

- `electron/` — Main process and preload
- `src/` — Renderer (React)
  - `components/` — UI components
  - `state/` — State management and undo system
  - `hooks/` — Custom React hooks
  - `utils/` — CSV parsing, selection utilities, fill operations
  - `ai/` — AI provider abstraction and prompts
- `cli/` — CLI entrypoint (agent-safe)
- `docs/` — Documentation

## Architecture Documents

- `docs/ARCHITECTURE.md` — Full architecture overview
- `docs/HOLY_SHEET_REPO_AUDIT.md` — Repo audit findings
- `docs/HOLY_SHEET_HARDENING_CHECKLIST.md` — Task-based hardening checklist
- `docs/HOLY_SHEET_AGENT_HANDOFF.md` — Agent handoff instructions
- `docs/STRATA_INTEGRATION_CONTRACT.md` — Strata integration contract

## PR Process

1. Pick a task from `docs/HOLY_SHEET_HARDENING_CHECKLIST.md`
2. Create a branch: `hs-###-short-description`
3. Make the smallest safe change
4. Add/update tests
5. Run `npm run lint && npm run test && npm run build`
6. Update the checklist status
7. Submit PR with description of changes

## Commit Style

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring
- `test:` — test additions/updates
- `docs:` — documentation
- `perf:` — performance improvement
- `security:` — security fix

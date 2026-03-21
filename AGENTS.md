# Repository Guidelines

## Project Structure & Module Organization

Potion Wars is a TypeScript + Ink CLI. Source lives in `src/`: entry `cli.tsx`, UI `ui/`, screen flows `screens/`, and Zustand store in `store/appStore.ts`. Core mechanics live in `core/` (combat, events, game, persistence, reputation, npcs, rivals, dialogue) with shared definitions in `types/`. Tests sit in `src/tests` (unit, integration, snapshots); mirror that layout. Compiled output goes to `dist/`—keep it generated-only.

**Documentation**: Project docs live in `docs/` (primer, persistence, testing, roadmap) and `.kiro/steering/` (product, structure, tech). See `CLAUDE.md` for architecture details and `docs/primer.md` for system design. Historical architecture decisions archived in `docs/archive/`.

## Build, Test, and Development Commands

Run Yarn scripts at the repo root. `yarn build` compiles TypeScript via `tsc`; `yarn dev` keeps the compiler in watch mode. `yarn start` runs the compiled CLI (`dist/cli.js`), so build first. `yarn lint` runs Prettier followed by XO, with `yarn lint:fix` auto-applying fixes. `yarn test` executes AVA (fail-fast) after a build, and `yarn test:fix` refreshes snapshots once formatting passes.

## Coding Style & Naming Conventions

Prettier drives formatting (2-space indent, no semicolons, single quotes) and XO React enforces lint rules. Components stay PascalCase, hooks/utilities camelCase, constants UPPER_CASE. Align new folders with existing names (e.g., `core/persistence`) and use barrel exports sparingly for clarity. Keep files focused on one concern and document only non-obvious logic. Imports follow ES Modules—compiled `.js` extensions resolve from `dist/`.

## Testing Guidelines

Target deterministic AVA coverage for new gameplay paths and UI states. Place specs in `src/tests`, mirroring the module route, and name them `*.test.ts` or `*.test.tsx`. Use `ink-testing-library` for terminal rendering, mock randomness and timers, and review snapshot diffs before running `yarn test:fix`. See `docs/testing.md` for scenario guidance.

## Commit & Pull Request Guidelines

Commits use the imperative voice seen in `git log` (“Refactor game context and action menu”) and stay scoped to one change. Rebase before opening a PR and confirm `yarn build`, `yarn lint`, and `yarn test` locally. PR descriptions should capture gameplay impact, enumerate touched modules (`src/screens/...`, `core/events/...`), link issues, and attach terminal transcripts or screenshots for visible output. Invite maintainers once checks pass and feedback is addressed.

## Release & Versioning

Ship via `yarn release` (release-it). Select semantic version bumps that match player-facing change magnitude, rebuild with `yarn build`, and verify `dist/cli.js` matches the compiled TypeScript. Generated artifacts stay unedited in source control.

## Additional Resources

**Core Documentation**:
- `CLAUDE.md` - Architecture overview and development guidelines for AI assistants
- `docs/primer.md` - Game mechanics, system design, and architecture evolution
- `docs/persistence.md` - Save system design and migration strategies
- `docs/testing.md` - Testing scenarios and patterns with AVA + ink-testing-library
- `docs/roadmap.md` - Feature roadmap and pre-release cleanup tasks

**Steering Documents** (`.kiro/steering/`):
- `product.md` - Core gameplay mechanics and target experience
- `structure.md` - Project structure and naming conventions
- `tech.md` - Technology stack and tooling configuration

**Archive**:
- `docs/archive/` - Historical architecture decisions and completed refactors

# Repository Guidelines

## Project Structure & Module Organization

TypeScript sources for the MCP server live in `src/`; `src/main.ts` bootstraps the server and `src/tools/` exposes Model Context Protocol tools. Shared helpers for logging, mutex control, trace processing, and formatting sit at the top level to keep concerns isolated. Tests belong in `tests/`, mirroring the source layout; `npm run build` emits JavaScript into `build/`, which should stay generated. Long-form docs live in `docs/`, and automation scripts sit in `scripts/`—always invoke them through npm scripts.

## Build, Test, and Development Commands

- `npm run build` — type-checks with `tsc` and writes output to `build/`.
- `npm run start` — builds then runs `build/src/index.js`.
- `npm run start-debug` — mirrors start with `DEBUG=mcp:*` enabled.
- `npm run test` — builds and runs Node tests at `build/tests/**/*.test.js`.
- `npm run test:only` — reruns only `.only` tests after a build.
- `npm run format` — runs ESLint fixes plus Prettier.
- `npm run docs` — rebuilds, regenerates docs, and formats results.

## Coding Style & Naming Conventions

Write strict TypeScript with ES modules and two-space indentation enforced by Prettier. Prettier also applies single quotes, no bracket spacing, trailing commas, and LF endings; run `npm run format` before committing. ESLint (`eslint.config.mjs`) requires license headers, consistent type-only imports/exports, alphabetized import blocks, and treats unused symbols without `_` prefixes as errors. Prefer named exports; reserve default exports for entry points such as `src/cli.ts`.

## Testing Guidelines

Place tests in `tests/**` with the `.test.ts` suffix to pick up the test-specific lint rules. Use `npm run test` for full runs, `npm run test:only` or `npm run test:only:no-build` when iterating, and `npm run test:update-snapshots` to refresh snapshots. Commit snapshot updates with their corresponding code.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) as seen in history, keeping each change scoped with matching tests or docs. PRs should include a concise summary, linked issues, and notes on how you tested; attach screenshots or CLI transcripts when user-visible behavior shifts.

## Environment & Configuration Tips

Use Node.js v22 per `.nvmrc` and the `engines` field. Manage dependencies with `npm`, avoid editing `node_modules/` or `build/` manually, and reach for `npm run start-debug` when you need verbose server logs.

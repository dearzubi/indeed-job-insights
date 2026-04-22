# Indeed Helper

Chrome extension that improves Indeed job search:
1. Highlights postings that mention your home city or nearby cities in the description body.
2. Shows driving travel time per posting.
3. Highlights user-defined keywords with a match-count badge and optional dim of zero-match cards.

## Requirements

- Node 22+, pnpm 10+.
- Personal Google Maps Distance Matrix API key with billing enabled (free $200/mo credit covers personal use).

## Setup

```bash
pnpm install
pnpm build
```

Load the unpacked extension from `dist/` at `chrome://extensions` → Developer mode → Load unpacked.

## Development

| Command | Purpose |
|---|---|
| `pnpm dev` | Rolldown watch mode (rebuilds on change) |
| `pnpm build` | production bundle to `dist/` |
| `pnpm test` | vitest (unit + injector integration) |
| `pnpm test:watch` | vitest watch mode |
| `pnpm check` | Biome + `tsc --noEmit` |
| `pnpm format` | Biome write mode |

Lefthook runs pre-commit (Biome + tsc) and commit-msg (Conventional Commits) automatically after `pnpm install`.

## Manual smoke checklist

After any change to `src/content/selectors.ts`, `description-fetch.ts`, or the injector:

1. `pnpm build`, reload the extension in `chrome://extensions`.
2. Open `https://ca.indeed.com/jobs?q=python&l=Toronto`.
3. Scroll slowly; verify card decorations (pills, border, distance, highlights) render correctly.
4. DevTools Network tab: confirm ≤1 `/viewjob` req/sec and ≤1 `distancematrix/json` req/sec.
5. Reload the page: confirm cached cities don't re-hit Distance Matrix.
6. Flip "Dim zero-match cards" in the popup: instant re-style, zero network.
7. Enter a bad API key in options: distance badges show `⚠`; pills and highlights still work.
8. Add a punctuated keyword (e.g. `.NET`): verify it matches in descriptions containing `.NET`.

## Architecture

Key boundaries:
- `src/content/selectors.ts` — only file that names Indeed DOM classes.
- `src/background/distance.ts` — only file that calls Google Maps.
- `src/content/matcher.ts` — pure, unit-tested match logic.

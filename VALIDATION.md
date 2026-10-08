# Validation — 8 October 2026

Observed locally on Windows / Node 24.11.0 / Wrangler 4.148.0.

| Check | Result |
|---|---|
| `npm run types` | Generated production bindings/runtime types |
| `npm test` | 18 tests passed across engine and AI boundary suites |
| 60-week deterministic simulations | Two same-seed runs produced identical state; diplomacy, battles and territorial events occurred |
| `npm run db:local` | Applied D1 migration 0001 successfully |
| `npm run test:api` | Real local Worker/D1 boot, partial resume, stale retry, concurrent exclusion, manual/automatic snapshots, exact restoration, invalid settings, session isolation and origin rejection passed |
| `npm run build` | TypeScript and Vite passed; frontend JS about 250.5 kB / 79.1 kB gzip |
| `npm run deploy:dry-run` | Worker and 10 static assets packaged; DB, AI, ASSETS and model variables present |
| Dependency audit | Compatible updates plus sharp override removed reported vulnerabilities; production audit also clear |
| Browser | Rendered all 66 paths; Next Turn advanced to 8 January, emitted 22 decisions and events; Save confirmation observed; country selection, Relations/Political mode, zoom/reset and settings dialog exercised |
| Responsive browser | 390×844 mobile viewport inspected with no horizontal overflow; temporary viewport override reset |
| Screenshot | `output/playwright/diplomacy.jpg` |

## Unverified / blocked

`wrangler whoami` reported an expired authentication token that could not be refreshed non-interactively. No live deployment, remote D1 migration or real Workers AI inference was performed. GLM and traditional response handling were verified using binding fixtures, not a remote model. The local config deliberately omits the unsupported AI binding; it uses the real deterministic simulation and local persistent D1.

GLM-4.7-Flash requires a paid Workers plan under Cloudflare's July 28, 2026 policy. The integration does not claim that model is free-tier available. Model/account access errors and quotas fall back visibly.

National geography is generalized upstream 1914 data; internal city catchments and route adjacency are gameplay abstractions. Historical precision, historical force/population authenticity and unimplemented naval warfare are documented in `public/data/ATTRIBUTION.md` and the README.

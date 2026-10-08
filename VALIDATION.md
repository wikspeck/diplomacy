# Validation — 8 October 2026

Production: https://ai-diplomacy-1914.wik-speck.workers.dev

| Check | Observed result |
|---|---|
| TypeScript / Vite production build | Passed; frontend JS 262.38 kB / 83.16 kB gzip |
| Vitest | 23 tests passed across engine, AI boundary and presentation suites |
| Geography | Regenerated 66 regions; three mainland Finland points verified inside Russian geometry |
| Cloudflare | Authenticated; remote D1 migration applied; Worker, static assets and AI binding deployed |
| Production HTTP / D1 | Boot, resumable turn, stale/concurrent retries, manual and automatic saves, exact restoration, invalid settings, isolated sessions and origin rejection passed |
| Live Workers AI | GLM returned a schema-valid decision for Germany in week 6; UI displayed WORKERS AI and Workers AI connected |
| Model robustness | Initial real model responses were empty or schema-invalid; corrected GLM parameters to disable thinking and use the strict decision JSON schema. Reported token usage is counted even when output fails validation. Failures remain explicitly labeled fallback |
| Browser animation | 15 SVG movement animations observed during week 4; next-round control disabled during presentation; week 5 showed a real war dispatch |
| Autoplay / Pause | Autoplay began week 7; Pause during processing finished that week and returned to manual waiting. Standard three-call AI budget restored afterward |
| Browser perspectives | 198 land gradient stops remained identical after selecting a different country in neutral Alliances; signed treaty networks shown; Relations used France's perspective |
| Browser geography | Clicking Helsinki selected Russian Empire / Grand Duchy of Finland; land visible on production map |
| Screenshots | output/playwright/diplomacy-production.jpg |

Backend resolution remains weekly and authoritative. Frontend playback shows recorded routes and events, then permits another round. Browser checks cover sampled rounds, not every possible battle or diplomacy outcome. AI output and response times vary; account/model errors use deterministic fallback. Saves are browser-cookie scoped with no cross-device account system.

National geography is generalized upstream 1914 data; internal city catchments and route adjacency are gameplay abstractions. Historical precision, force/population authenticity and unimplemented naval warfare are documented in public/data/ATTRIBUTION.md and README.md.

Earlier local verification additionally exercised 60-week deterministic simulations, local D1 migration, packaging dry run and a 390x844 mobile viewport without horizontal overflow. Current deployment was validated against real remote D1 and in the production browser.

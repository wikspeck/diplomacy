# AI Diplomacy: Europe 1914

A functioning observer strategy simulation: 22 autonomous governments, 66 strategic regions, weekly diplomacy and combat, persistent saves, a historical SVG map, and Cloudflare Workers AI with deterministic fallback.

## Run locally

Requires Node.js 22.12+ and npm (tested with Node 24.11).

```sh
npm ci
npm run db:local
npm run dev:worker
```

Open **http://127.0.0.1:8787**. The local Worker serves the production frontend and API with local D1. No Cloudflare login or inference credentials are needed. `wrangler.local.jsonc` omits the AI binding because Workers AI cannot be emulated locally. Decisions are visibly labeled deterministic fallback.

For frontend hot reload, keep the Worker running and run `npm run dev` in another terminal. Open http://127.0.0.1:5173; Vite proxies `/api` to the Worker.

Use Next Turn to finish one week or Play to continue. Pause finishes the in-progress week. Select nations and regions, inspect army attributes, diplomacy and numerical battle reports, change map modes, drag to pan and scroll to zoom. Save creates a manual snapshot; Load offers it and the latest 20 completed weeks. The backend also persists partial turn progress, so refresh resumes unfinished work. Restart returns the current game to its initial seed and retains snapshots.

## Deploy on Cloudflare

Production uses root `wrangler.jsonc`, D1 `DB`, Workers AI `AI`, and Static Assets `ASSETS`. It builds automatically with `npx wrangler deploy`.

```sh
npx wrangler login
npx wrangler d1 create diplomacy
```

Add the returned `database_id` to the `d1_databases` entry in `wrangler.jsonc`, retaining binding `DB`. Then:

```sh
npx wrangler d1 migrations apply diplomacy --remote
npx wrangler deploy
```

The config also supports Wrangler automatic resource provisioning without `database_id`, but creating D1 explicitly lets you apply the schema before the first request. Deploy the production config, not `wrangler.local.jsonc`. Credentials stay in Wrangler/Cloudflare; no frontend key is needed. Do not commit `.dev.vars`, `.env` or API tokens.

Inference calls `env.AI.run()` server-side. The default model is `@cf/zai-org/glm-4.7-flash`. Change the model in the dialog for existing saves, or `AI_MODEL` for new saves. To test real inference locally after authenticating, run `npx wrangler dev --var LOCAL_AI_ENABLED:true` with the production config; this makes real, potentially billable account calls.

**GLM-4.7-Flash requires a paid Workers plan as of July 28, 2026.** Its availability is not a free-tier guarantee. Access denial/quota failures switch visibly to deterministic AI. See [Cloudflare's model plan notice](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/) and [current Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/). Select a model your account supports or set the call budget to zero. Workers, D1 and Static Assets have free allowances; unlimited free use is not promised. This application cannot query remaining daily Neuron quota.

Defaults: three configured LLM powers (Germany, France, Britain), three calls per week, 650 maximum output tokens. Settings allow country selection, model selection, up to five calls and output-token limits. When selected countries exceed the budget, processing order determines which receive inference. An AI failure opens a five-minute cooldown; no automatic model retries are made. Per-agent decisions are cached in saved turn progress and reused on resume. Usage separates actual model-reported tokens from estimated prompt tokens. Reasoning models may consume their output budget without usable JSON, in which case fallback is explicit.

## Engine and persistence

- `shared/seed.ts`: governments, national tendencies, initial relations, armies and balance values. Starting affinities do not create treaties automatically.
- `scripts/build-map.mjs`: reproducible geographic transformation and strategic route graph. Builds use committed geometry and need no downloads.
- `shared/engine.ts`: authoritative ownership/control, diplomacy, independent acceptance, guarantees, access, ultimatums, territory demands, peace, ceasefires, betrayal, seeded combat, retreat, recruitment, reinforcement, entrenchment, merging/splitting, supply and 70% VP-loss capitulation.
- `shared/ai.ts`: deterministic strategy and isolated agent information views. Each agent receives its own plans and summarized memory, public diplomacy and coarse strength estimates, never another nation's private plans.
- `shared/validation.ts`: strict Zod schemas and action budgets. The engine additionally checks IDs, ownership, routes, war, access, ceasefires and resources. Each army can act once per week.
- `worker/index.ts`: at most one inference call per HTTP step, or five deterministic decisions. After all governments act, the bounded engine resolves diplomacy, units, battles, economy, supply, capitulation and memory, then saves the week.
- `migrations/0001_games.sql`: state, resumable work, versions, processing leases and snapshots in D1.
- `src/`: React observer interface and political/alliances/relations/control map.

Snapshots contain RNG state and exact decisions for deterministic continuation. LLM choices themselves are not reproducible; replay stored decisions for identical combat resolution. Reports explain attack/defense power, terrain and losses. Supply follows a graph connection to the capital through controlled/access territory; isolated armies suffer attrition. Sea routes are explicit and permit friendly transport only.

An unguessable HttpOnly SameSite cookie scopes each browser's game and saves. There is no account or cross-device sync; clearing the cookie loses access to the save. This is a single-observer application, not a public service with global abuse controls. Large public deployments should add identity, rate limits and total AI spending controls.

Mutations carry the state version. Stale retries return current state without advancing it. D1 atomically acquires a per-game lease. Inference times out after 25 seconds against a 60-second lease. State commits use a version/lease compare-and-swap; automatic snapshots share the atomic batch. A crashed request resumes after lease expiry. Inference may be billed again following an uncommitted crash; game actions commit only once. Cross-origin requests are rejected and SQL uses prepared statements.

## Historical scope and license

Outlines use André Ourednik and contributors' [Historical Basemaps 1914 geometry](https://github.com/aourednik/historical-basemaps/blob/master/geojson/world_1914.geojson). Original data, source README and upstream GPL-3.0 license are in `public/data/`. Project code is GPL-3.0-or-later; see `LICENSE`.

**Internal regions are city-centered gameplay catchments clipped to historical outlines, not authentic province borders.** The route graph is simplified. This is an explicit larger-region compromise, not modern country polygons reassigned to empires. Congress Poland and Finland are Russian, Ireland is British, Alsace-Lorraine is German and Bosnia-Herzegovina is Austro-Hungarian. Caucasus labels in the source are corrected to Russian imperial ownership. The data is a generalized 1914 reconstruction with remaining inaccuracies; exact surveyed January 1 borders are not claimed. Population allocations, army sizes and VP values are balance estimates. Colonies, eastern Russia, naval combat and naval invasions are outside scope. National outline strokes show initial 1914 borders; regional colors and occupation hatching show subsequent changes. See [full attribution and limitations](public/data/ATTRIBUTION.md).

Rebuild geometry with `npm run map:build`, using bundled original data and development dependencies.

## Validation

```sh
npm run types
npm run build
npm test
npm run deploy:dry-run
# While npm run dev:worker is running, in another terminal:
npm run test:api
```

Engine tests cover seed ownership/routes, invalid orders, war prerequisites, independently accepted proposals, guarantees, negotiated transfers, peace, capitulation, seeded battle reports, recruitment, strict schemas, isolated agent views, reproducible 60-week simulations and snapshot continuity. AI binding fixtures cover GLM/traditional response formats, usage, malformed output, model failure, cooldown and budgets. HTTP integration tests use real local D1 to check partial resume, stale/concurrent retries, exact save/load, settings validation, session isolation and origin checks.

A build and dry run verify code and packaging, not account permissions, remote D1 or live inference. Remote deployment additionally needs authenticated Cloudflare access and the D1 schema applied.

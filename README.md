# Demographic Reaction Engine

Test how the US population would react to a startup pitch, ad headline, product page, YouTube video, or policy proposal — before you ship it. The engine simulates a representative cross-section of America by combining Google Gemini with the **NVIDIA Nemotron-Personas-USA** dataset (synthetic personas grounded in US Census distributions for age, gender, education, occupation, marital status, city, and state).

Submit any copy or URL and the app returns a population-scale reaction: an overall stance score, per-segment breakdowns across five demographic dimensions, a histogram of where individual agents land on the support/oppose spectrum, a heatmap of demographic archetypes, raw verbatim quotes, and a browsable directory of every simulated agent and their personal score.

View the hosted app on AI Studio: https://ai.studio/apps/b127578e-d8ac-43b2-97e9-b208ead7367c

## How it works

1. **Persona pool** — On startup the frontend loads up to 20,000 personas from [src/data/nemotron-agents.json](src/data/nemotron-agents.json) (sampled to be balanced across the Nemotron dimensions). You pick a subset size (100–20,000) at simulation time.
2. **Pitch submission** — You paste copy or a URL into the input console. If a URL is detected, [server.ts](server.ts) scrapes the page title, meta description, and stripped body text (up to 2 URLs, 6s timeout each) and feeds the extracted context into the Gemini prompt.
3. **Segmented reaction** — The server calls Gemini with a strict JSON response schema covering five Nemotron-native dimensions (age group, education, region, gender, marital status). For each segment Gemini returns a stance score from -100 to +100, plus 2–3 concerns and 2–3 benefits. It also returns an overall synthesis (winners, losers, key takeaway) and 12–14 verbatim quotes from invented individuals.
4. **Per-agent scoring** — [src/utils/evaluationMapper.ts](src/utils/evaluationMapper.ts) collapses the segment scores into a single number per agent using a weighted blend (education 30%, age 25%, region 20%, gender 15%, marital status 10%) plus a deterministic per-agent variance derived from the agent ID, so the same agent always lands in roughly the same place across reloads.
5. **Visualization** — The frontend then renders:
   - **Stance distribution histogram** — [src/components/StanceDistribution.tsx](src/components/StanceDistribution.tsx) bins all agents into 20 stance buckets from strong oppose to strong support.
   - **Executive summary** — [src/components/ExecutionSummary.tsx](src/components/ExecutionSummary.tsx) shows overall score, support rate, oppose rate, polarization index, and Gemini's narrative summary.
   - **Verbatim stream** — Six of Gemini's raw quotes, color-coded by sentiment.
   - **Archetype heatmap** — [src/components/ArchetypeHeatmap.tsx](src/components/ArchetypeHeatmap.tsx) crosstabs demographic segments against stance.
   - **Agent directory** — [src/components/AgentDirectory.tsx](src/components/AgentDirectory.tsx) lists every individual agent with their bio, score, and a procedurally generated quote tailored to their demographics.

## Run locally

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your Gemini API key:

```bash
cp .env.example .env
```

Then edit [.env](.env) and set:

```
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL="http://localhost:3000"
```

### 3. (Optional) Refresh the persona dataset

The repo already ships with [src/data/nemotron-agents.json](src/data/nemotron-agents.json). To re-fetch a fresh balanced sample of 20,000 personas from the NVIDIA Nemotron-Personas-USA dataset via the HuggingFace datasets-server API, run:

```bash
npm run fetch-data
```

### 4. Start the dev server

```bash
npm run dev
```

The server starts on [http://localhost:3000](http://localhost:3000) with Vite middleware for hot reload of the React frontend.

## Dataset manipulations

The shipped [src/data/nemotron-agents.json](src/data/nemotron-agents.json) is the upstream Nemotron-Personas-USA sample with two local modifications applied:

### Minors removed

All personas with `age < 18` were dropped (3,746 records). The remaining pool is 13,354 working-age agents. This avoids meaningless income matches for children and aligns the pool with the workforce universe used by ACS.

### Income enriched from Census ACS PUMS

Each agent received an `income` field via k-nearest-neighbor lookup against the **2023 ACS 1-year PUMS person records** (~3.4M rows from the U.S. Census Bureau).

**Matching keys (exact)**

| Agent field | PUMS field | Notes |
| --- | --- | --- |
| `state` | `STATE` | mapped through FIPS code table |
| `gender` | `SEX` | Male=1, Female=2 |
| `education` | `SCHL` bucket | HS = SCHL 01–17, Some College/Associate = 18–20, Bachelor's = 21 |
| `occupation` | `OCCP` | fuzzy match (token-Jaccard + singularization) on the 530 OCCP labels, with ~30 hand overrides for short/ambiguous strings ("Lawyer", "Architect", "Radiologist", etc.) |

**Distance + aggregation**

Within the matched cell, the **25 records closest by age** are selected, and the **weighted median** of `PINCP × ADJINC` (total personal income adjusted to 2023 dollars) is taken, weighted by the PUMS person weight `PWGTP`.

**Fallback ladder** when the exact cell has fewer than 5 records:

1. Same state, broader occupation group (OCCP first digit), same education and sex.
2. Drop the state requirement; keep occupation + education + sex.
3. Drop the state requirement and broaden occupation.

Agents with `occupation` = `"Not in Workforce"` or `"No Occupation"` are matched against PUMS records with no occupation (retirees, students, unemployed); their `PINCP` reflects Social Security, retirement, and other non-wage income.

**Result distribution**

- Income range: $0 – $418,000
- 25th percentile: $16,300 / median: $31,200 / 75th percentile: $51,000
- Match-source breakdown: 55% exact cell, 15% state + broader occupation, 30% NILF, <0.1% national fallback.

**Caveats**

- A handful of agents in the upstream dataset list high-credential occupations (Physician, Lawyer) with only HS or Bachelor's education. Because the matcher honors the education bucket, those agents get lower incomes than typical for their stated occupation — the inconsistency is in the input, not the lookup.
- ACS PUMS is U.S.-only. Puerto Rico is included (state FIPS 72).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Express + Vite dev server on port 3000 |
| `npm run build` | Build the frontend with Vite and bundle the server with esbuild into `dist/` |
| `npm start` | Run the production build from `dist/server.cjs` |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run clean` | Remove the `dist/` directory and any built `server.js` |
| `npm run fetch-data` | Re-fetch the Nemotron personas dataset |

## Project layout

- [server.ts](server.ts) — Express server exposing `POST /api/react`, which scrapes any URLs in the pitch, calls Gemini with a structured response schema, and returns the aggregated reaction.
- [src/App.tsx](src/App.tsx) — Top-level React component that orchestrates the pitch submission flow and renders the dashboard.
- [src/data/personaGenerator.ts](src/data/personaGenerator.ts) — Loads the Nemotron personas JSON and returns a session-stable shuffled subsample.
- [src/utils/evaluationMapper.ts](src/utils/evaluationMapper.ts) — Maps Gemini's segment-level results onto individual agents and synthesizes per-agent quotes.
- [src/components/](src/components/) — The five dashboard panels (input console, stance distribution, executive summary, archetype heatmap, agent directory).
- [scripts/fetch-nemotron.ts](scripts/fetch-nemotron.ts) — One-off script to refresh the persona dataset from HuggingFace.
- [vite.config.ts](vite.config.ts) — Vite + Tailwind + React plugin configuration.

## Example inputs to try

- A startup elevator pitch ("AI-powered tax filing for gig workers — $9/mo, files your quarterlies automatically")
- An ad headline or product tagline
- A URL to a product page, YouTube video, or news article
- A draft policy proposal ("A federal $15/hr minimum wage with regional cost-of-living adjustments")

## Troubleshooting

- **`GEMINI_API_KEY environment variable is required`** — Make sure you created a `.env` file (not `.env.local`) in the project root and that `npm run dev` was restarted after the change.
- **Port 3000 already in use** — Stop the other process or edit the `PORT` constant in [server.ts](server.ts).
- **URL scraping returns empty content** — Some sites block bots; the model is instructed to fall back to its own world knowledge using the URL path, brand patterns, or video ID when scraping fails.

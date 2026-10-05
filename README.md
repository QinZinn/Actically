<p align="center">
  <img src="public/brand/actically-project-logo.png" alt="Actically logo" width="144" />
</p>

# Actically

**Turn AI answers into lasting understanding.**

Actically is a Vietnamese learning workspace that connects guided questions, self-explanation and spaced repetition. Powered by **NVIDIA Nemotron through Nebius Token Factory**, it helps learners work through a topic, practice recalling it and return to it over time.

**Public demo:** not published yet. **Demo video:** not published yet.

## For judges and testers

- **Code repository:** [github.com/QinZinn/Actically](https://github.com/QinZinn/Actically)
- **License:** [MIT](LICENSE), an [OSI-approved open source license](https://opensource.org/license/mit).
- **Setup:** follow [Run locally](#run-locally) for real Supabase storage and Nemotron inference, or [Preview without credentials](#preview-without-credentials) for a labelled fixture preview.
- **NVIDIA and Nebius implementation:** see [How we use NVIDIA Nemotron](#how-we-use-nvidia-nemotron) and [How Nebius Token Factory accelerated development](#how-nebius-token-factory-accelerated-development).
- **Reproduce the learning flow:** follow the [demo walkthrough](#demo-walkthrough). Validation commands and the distinction between synthetic and live checks are in [Checks and validation](#checks-and-validation).

## Features

| Area | What you can do |
| --- | --- |
| Learn with AI | Explore Socratic questions, structured step-by-step solutions or direct explanations. Ask about individual solution steps. |
| Study materials | Organize study sets and paste reference sources. |
| Feynman practice | Explain concepts in your own words and receive feedback on clarity, completeness and accuracy. |
| Blurting practice | Recall with references hidden, then compare correct, missing and incorrect ideas. |
| Knowledge library | Review, edit and approve extracted concepts before generating flashcards. |
| Spaced repetition | Reveal answers, rate recall and let FSRS schedule the next review. |
| Progress and history | Revisit saved sessions and practice attempts, and follow progress grounded in review records. |

The interface supports desktop and narrow screens, Markdown, mathematical notation, search and a collapsible sidebar. AI feedback is learning guidance, not a certification of mastery.

## How we use NVIDIA Nemotron

NVIDIA Nemotron is the application's only configured model family for real AI features. Requests run on the server through Nebius Token Factory; API keys are never sent to the browser. The exact model is selected with `NEBIUS_MODEL` and checked against the account's authenticated model catalog. There is no silent fallback to another model provider.

| Learning task | Nemotron's role |
| --- | --- |
| Socratic and Ask chat | Generate a focused guiding question or a direct explanation, streamed to the learner. |
| Solve | Return structured teaching steps, principles and a comprehension question; support follow-up on an individual step. |
| Feynman | Compare the learner's explanation with approved concept snapshots and return evidence-linked feedback and scores when evidence is sufficient. |
| Blurting | Identify correct recall, omissions and misconceptions against selected references, distinguishing missing material from incorrect claims. |
| Concept extraction | Propose concepts grounded in supplied source snapshots. The learner must approve them before card generation. |
| Flashcards | Generate a recall question and answer from an approved concept, retaining source provenance. |

The application uses inference rather than training or fine-tuning Nemotron. It validates structured responses with Zod and checks literal source excerpts and learner quotations before accepting results. These checks establish format and evidence integrity, not a guarantee of semantic correctness. FSRS review scheduling and progress aggregation are application logic, separate from model-generated feedback.

Implementation references:

- [Nebius/Nemotron provider](src/server/ai/nebius.ts): authenticated catalog checks, chat completions, streaming, structured responses, timeouts and cancellation.
- [Versioned prompts](src/server/ai/prompts.ts): instructions for each learning task.
- [Evidence validation](src/server/ai/validation.ts): source and quotation checks.
- [AI service contracts](src/contracts/ai.ts) and [server composition](src/server/composition.ts): integration with the authenticated application.
- [Live AI tests](tests/ai/live.test.ts): opt-in checks with synthetic educational examples sent to the configured real model.

## How Nebius Token Factory accelerated development

Token Factory provides the hosted inference layer for Nemotron through its OpenAI-compatible API at `https://api.tokenfactory.nebius.com/v1/`. This let us integrate the model without provisioning GPU servers, downloading model weights or operating an inference server.

One server-side adapter uses the same API for streamed conversations and JSON-schema requests across the learning features. That kept provider integration in one place while we developed task-specific prompts, response validation and the frontend learning flow. The authenticated catalog and [model-listing script](scripts/list-nebius-models.mjs) also make account-specific model configuration reproducible for testers. These are concrete workflow benefits; no development-time or performance speedup has been benchmarked.

**Nebius services used:** Token Factory model catalog and inference API. No other Nebius tools or services, dedicated GPU deployment, fine-tuning or Nebius storage are used in the current implementation. Authentication and persistent storage use Supabase. Vercel deployment instructions are provided below.

## Built with

| Layer | Technologies |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Interface | Tailwind CSS, Radix UI, Lucide |
| Authentication and storage | Supabase Auth, PostgreSQL, Drizzle ORM |
| AI | NVIDIA Nemotron, Nebius Token Factory, server-side streaming and structured output |
| Learning and rendering | FSRS (`ts-fsrs`), KaTeX, React Markdown |
| Validation and tests | Zod, Vitest, PGlite |
| Runtime and tooling | Node.js 24, pnpm 11.19.0 |

## Run locally

### 1. Install dependencies

Install Node.js 24 and pnpm 11.19.0, then clone the repository and install its locked dependencies:

```sh
git clone https://github.com/QinZinn/Actically.git
cd Actically
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local`. On PowerShell, this preserves existing configuration:

```powershell
if (!(Test-Path .env.local)) {
  Copy-Item .env.example .env.local
}
```

### 2. Configure environment variables

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key or legacy public anon key. Keep this variable name; never use a secret/service-role key here. |
| `NEXT_PUBLIC_DEMO_MODE` | `false` for real data and AI; `true` for the fixture preview below. |
| `DATABASE_URL` | Supabase PostgreSQL URI. A session pooler connection supports local development on IPv4. |
| `NEBIUS_API_KEY` | Your Nebius Token Factory API key. |
| `NEBIUS_MODEL` | Exact NVIDIA Nemotron model ID from your authenticated catalog. |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1/` |
| `ACTICALLY_LIVE_AI` | `false` normally; `true` only for opt-in live AI tests. This does not disable AI in the app. |
| `APP_URL` | `http://localhost:3000` locally; your HTTPS origin in production. |

Find the Supabase URL and publishable key in **Connect** or **Settings → API Keys**. Copy the database URI from **Connect**, replacing its password placeholder with the database password. URL-encode special characters in the password.

Keep `.env.local` private; Git excludes it. Database credentials and the Nebius key stay server-side. A Supabase service-role key is not required.

### 3. Configure authentication and initialize the database

In Supabase **Authentication → URL Configuration**, set:

- Site URL: `http://localhost:3000`
- Allowed redirect URL: `http://localhost:3000/auth/callback`

Confirm `DATABASE_URL` points to the intended database, then apply the committed migrations:

```sh
pnpm db:migrate
```

The three migrations create the application schema and access policies. Use these as the single schema authority; do not create duplicate tables manually. `pnpm db:generate` is for deliberate schema development, not initial setup.

### 4. Verify the model and start

After saving `NEBIUS_API_KEY`, list available Nemotron IDs:

```sh
node --env-file-if-exists=.env.local scripts/list-nebius-models.mjs
```

Copy an exact ID from `nemotronModels` into `NEBIUS_MODEL`, then run:

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000), sign up and confirm your email if prompted. Create a study set and paste a source to begin. Restart the server after changing environment variables.

The catalog command verifies availability, not generation quality or streaming capability. Invalid AI configuration produces an explicit error; the app does not silently substitute another provider or fixture responses.

## Preview without credentials

Set `NEXT_PUBLIC_DEMO_MODE=true` before starting the app. This enables a visibly labelled preview with synthetic data and AI replies. Data lives in memory and resets on a full reload. Supabase and Nebius credentials are not required for this preview.

Use `NEXT_PUBLIC_DEMO_MODE=false` to demonstrate real authentication, persistence and model responses. Public environment variables are compiled into the browser bundle; rebuild a deployed app after changing them.

## Deploy on Vercel

1. Push the application and lockfile to GitHub, including `public/brand/` for the logo. Import the repository into Vercel and select the branch containing the integrated application.
2. Choose **Next.js**, the repository root and **Node.js 24.x**. Install with `pnpm install --frozen-lockfile`; build with `pnpm build`. Leave the output directory at its framework default.
3. Add the environment variables above to **Production**. Use `NEXT_PUBLIC_DEMO_MODE=false`, `ACTICALLY_LIVE_AI=false` and your production HTTPS origin as `APP_URL`. For serverless database access, use Supabase's transaction pooler URI; the database client already disables prepared statements.
4. Apply database migrations before use. Vercel builds do not run migrations. If using the same initialized database as local development, a second schema setup is unnecessary.
5. Update Supabase's Site URL and add `https://YOUR-DOMAIN/auth/callback` to allowed redirects. Keep the localhost callback for local development.
6. Ensure Function duration exceeds the application's 60-second AI deadline; 120 seconds is a reasonable setting where supported. Redeploy after changing environment variables.
7. Test the production URL in a private browser window: sign in, ask AI, approve a concept, generate/review a card and reload history. Confirm reviewers can open the URL without a Vercel team login.

Vercel references: [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [environment variables](https://vercel.com/docs/environment-variables), [Function duration](https://vercel.com/docs/functions/configuring-functions/duration).

For a conventional Node.js host, run `pnpm build` followed by `pnpm start`. Supply the same environment variables and allow streaming responses without reverse-proxy buffering.

## Checks and validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The latest recorded code checks passed typecheck, lint and production build, with **120 tests passing and 2 opt-in live tests skipped**. After final presentation changes, the frontend suite was repeated: **56 tests passed**.

Integration tests exercise the production HTTP adapter, actual route handlers, a verified-identity test shim, PostgreSQL semantics through PGlite and AI validation with synthetic responses. They cover ownership boundaries, source versions, streaming/cancellation, safe retries, review grading and practice history. They do not replace live service or browser validation.

Local setup has since verified Supabase Auth connectivity, database connectivity, all three applied migrations and the configured model's presence in the authenticated Nebius catalog. The owner reports successful local use. Automated live AI evaluation and production deployment checks have not yet been recorded.

To run optional live AI tests, configure the provider, set `ACTICALLY_LIVE_AI=true` locally and run:

```sh
pnpm test:ai:live
```

This uses synthetic educational examples and makes bounded, billable provider requests. See [AI usage](docs/AI-USAGE.md) for the call budget and scope. Return the flag to `false` afterward.

## Demo walkthrough

1. Create a study set and paste a short reference source.
2. Explore it with Socratic questions or a step-by-step solution.
3. Finish the session, review extracted concepts and approve one.
4. Generate a flashcard, reveal its answer and grade recall.
5. Explain the concept with Feynman practice or recall it with Blurting.
6. Show progress, then reload and reopen saved history.

Use the [demo outline](docs/DEMO-OUTLINE.md) for a fuller recording script. Clearly identify fixture mode if it appears in a recording.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API contracts](docs/API-CONTRACT.md)
- [AI integration](docs/AI-INTEGRATION.md) and [provider usage](docs/AI-USAGE.md)
- [Integration checklist](docs/INTEGRATION-CHECKLIST.md)
- [Integration handoff](docs/handoffs/integration.md) and [UI refresh](docs/handoffs/ui-refresh.md)
- [Original work and references](docs/ORIGINAL-WORK.md)

Historical handoffs record implementation-time limitations; the validation section above includes subsequent local configuration checks.

## License

Actically's original code and documentation are licensed under the [MIT License](LICENSE), an [OSI-approved license](https://opensource.org/license/mit). Copyright (c) 2026 Actically contributors. Third-party dependencies, NVIDIA model weights and supplied reference assets retain their respective terms; the application's MIT license does not relicense them. Model weights are not distributed in this repository.

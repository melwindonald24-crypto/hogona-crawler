# Hogona Drive enrichment pipeline

Hogona collects Karnataka place results from Serper Places and enriches them
through one file-based workflow. There is no manual import/export path and no
Google Drive API integration in this repository.

For the complete stage-by-stage function reference, see
[PIPELINE_FLOW.md](PIPELINE_FLOW.md).

## How Drive works

`DRIVE_SYNC_ROOT` is a folder on the machine running this CLI.

- When it points to a Google Drive for Desktop synced folder, the Google Drive
  desktop app uploads and downloads the files automatically.
- When it is unset, Hogona uses `tmp/drive-sync` for local testing.
- Node.js never authenticates with Google or calls a Drive API.

The folder has a fixed layout:

```text
DRIVE_SYNC_ROOT/
  pending/                 # batches exported by Hogona
  processed/               # completed batches written by the enrichment worker
  processed/imported/      # batches Hogona has imported successfully
```

## Setup

Requires Node.js 18+, PostgreSQL, and a Serper API key.

```bash
npm install
```

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
SERPER_API_KEY=your-serper-api-key
DRIVE_SYNC_ROOT=G:\My Drive\Hogona Enrichment
```

`DRIVE_SYNC_ROOT` is optional. Omit it to test locally before configuring
Google Drive for Desktop.

## One workflow

```text
discover -> queue -> export -> enrichment worker -> import
```

1. Collect and queue candidates:

   ```bash
   npm run discover
   npm run queue
   ```

2. Export up to three jobs:

   ```bash
   npm run export -- 3
   ```

   This creates `pending/<batch-id>.json` and records that exact `batch_id`
   against the exported jobs in PostgreSQL.

3. The enrichment worker reads one file from `pending/`, researches every
   place, then writes its response to:

   ```text
   processed/<batch-id>.result.json
   ```

   The output must keep the original `batch_id`, set `status` to `completed`,
   and contain exactly one result for every input job. The worker should not
   overwrite the pending file. After confirming the result was written, it
   should remove the input file from `pending/` so it is not processed again.

   **Automation boundary:** the CLI manages database state and files; a
   Drive-capable worker performs the research. For a ChatGPT scheduled task,
   configure Drive access and run it periodically with this instruction:
   “Process at most one JSON file from `pending/`. Follow its `instructions`,
   then write the completed JSON to `processed/<batch-id>.result.json` without
   modifying it; delete the input only after the result write succeeds.”

4. Import completed results:

   ```bash
   npm run import
   ```

   Hogona validates the result, verifies it matches the exact exported batch,
   stores it with `confidence: needs_review`, and moves the file to
   `processed/imported/`. Invalid files stay in `processed/` with an error so
   they can be fixed and retried.

## Enrichment rules

Every filled factual field needs an HTTP(S) source whose `supports` list names
that exact field. Use `null` when a fact cannot be verified.

`traversability` (`easy`, `moderate`, or `difficult`) and
`visit_duration_minutes` (a positive whole number) are required estimates and
do not need citations. The worker must not provide `confidence`.

## Commands

```text
npm run discover       Collect Serper Places evidence.
npm run queue          Create deduplicated enrichment jobs.
npm run export -- 3    Export 1-3 jobs to pending/.
npm run import         Import all completed batches from processed/.
npm test               Run unit tests.
```

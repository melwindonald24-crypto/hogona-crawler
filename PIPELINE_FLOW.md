# Hogona end-to-end pipeline flow

This is the single Drive-folder enrichment workflow. The Node.js application
does not call the Google Drive API: Google Drive for Desktop syncs the local
folder configured by `DRIVE_SYNC_ROOT`.

## Preconditions

Set these values in `.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
SERPER_API_KEY=your-serper-api-key
DRIVE_SYNC_ROOT=G:\My Drive\Hogona Enrichment
```

If `DRIVE_SYNC_ROOT` is omitted, the local test folder is
`tmp/drive-sync`.

## System map

```text
npm run discover
  -> discovery_job + raw_evidence
npm run queue
  -> enrichment_job (pending)
npm run export -- 3
  -> enrichment_job (exported, batch_id)
  -> DRIVE_SYNC_ROOT/pending/<batch-id>.json
external Drive worker
  -> DRIVE_SYNC_ROOT/processed/<batch-id>.result.json
npm run import
  -> enrichment_job (completed, output_data)
  -> DRIVE_SYNC_ROOT/processed/imported/<batch-id>.result.json
```

## 1. Discover Serper Places results

Run:

```bash
npm run discover
```

Entry script: `scripts/collectSerperKarnataka.js`.

| Function / component | What it does |
| --- | --- |
| `configFor(district, category)` | Builds the reproducible Serper query configuration: district, category, query text, country, and language. |
| `getOrCreateJob(config)` | Creates or reuses a `discovery_job` for that exact Serper configuration. |
| `collectDistrictCategory(district, category)` | Runs one discovery job. It skips completed jobs, marks a running job, saves the raw response, then marks it completed or failed. |
| `SerperPlacesService.getDocuments(discoveryJob)` | Validates `config.q`, calls the Serper Places endpoint with `SERPER_API_KEY`, and returns the untouched provider response as a document. |
| `RawEvidenceService.createRawEvidence({ discoveryJobId, sourceUrl, content })` | Writes the untouched Serper response to `raw_evidence`. |

Database state:

```text
discovery_job.status: pending -> running -> completed
                                  \-> failed
```

Completed discovery jobs are skipped on later runs. Raw Serper responses are
kept in `raw_evidence` so queueing can be repeated without another API call.

## 2. Queue places for enrichment

Run:

```bash
npm run queue
```

Entry script: `scripts/queueSerperPlacesForEnrichment.js`.

| Function / component | What it does |
| --- | --- |
| `ensureEnrichmentJobSchema()` | Creates `enrichment_job` when missing, or safely adds the `batch_id` column and index to an existing table. |
| `parseSerperResponse(content)` | Extracts the `places` array from stored Serper JSON. |
| `sourcePlaceId(place)` | Builds the stable deduplication key: `placeId`, then `cid`, then a SHA-256 hash fallback. |
| `enrichmentJob.findOrCreate(...)` | Creates one pending `enrichment_job` per unique provider place. Existing places are not duplicated. |

The queued record includes the original Serper metadata, district, and
category. Its initial state is:

```text
enrichment_job.status = pending
enrichment_job.batch_id = null
```

## 3. Export a Drive batch

Run:

```bash
npm run export -- 3
```

The argument is a batch size from 1 to 3. Entry script:
`scripts/exportEnrichmentBatch.js`.

| Function / component | What it does |
| --- | --- |
| `ensureEnrichmentJobSchema()` | Ensures the `batch_id` storage exists before jobs are claimed. |
| `createBatchId()` | Creates a unique ID in the form `batch-YYYY-MM-DD-<random>`. |
| `claimPendingJobs(enrichmentJob, batchId, limit)` | In a database transaction, locks available pending jobs, changes them to `exported`, and records the batch ID. `skipLocked` prevents two exporters from claiming the same jobs. |
| `buildBatchPayload(jobs, batchId)` | Creates the JSON handoff: input places, required result schema, citations rules, and the exact batch ID to return. |
| `writePendingBatch(batchId, payload)` | Writes `pending/<batch-id>.json` under `DRIVE_SYNC_ROOT`. |
| `releaseBatch(enrichmentJob, batchId)` | Restores jobs to `pending` and clears their batch ID if writing the batch file fails. |

After a successful export:

```text
enrichment_job.status: pending -> exported
enrichment_job.batch_id: null -> <batch-id>
```

## 4. External Drive enrichment worker

This step is external to the Node.js code. It can be a ChatGPT scheduled task
with Drive access or another worker that can access the synced Drive folder.

For one pending file, the worker must:

1. Read `pending/<batch-id>.json` and follow its `instructions` field.
2. Research every input place.
3. Keep the supplied `batch_id` unchanged.
4. Produce one result per input `job_id`.
5. Set the outer `status` to `completed`.
6. Write `processed/<batch-id>.result.json`.
7. Only after the result file is written successfully, remove the matching
   pending file to prevent duplicate work.

Each factual value needs an HTTP(S) source in this form:

```json
{ "url": "https://example.org", "supports": ["summary"] }
```

`traversability` and `visit_duration_minutes` are the only uncited estimates.
The worker must not set `confidence`.

## 5. Import completed batches

Run:

```bash
npm run import
```

Entry script: `scripts/importEnrichmentBatches.js`.

| Function / component | What it does |
| --- | --- |
| `listCompletedBatchFiles()` | Lists only top-level `processed/*.result.json` files. Archived files are ignored. |
| `readCompletedBatch(filename)` | Reads and JSON-parses a completed result file. |
| `validateCompletedBatch(batch)` | Validates batch ID, completed status, unique job IDs, required estimates, prohibited `confidence`, and field-specific HTTP(S) citations. |
| `importCompletedBatch(enrichmentJob, batch)` | In a transaction, verifies the returned job IDs exactly equal the still-exported jobs with that batch ID, then writes the output and changes all jobs to completed. |
| `archiveCompletedBatch(filename)` | Moves an imported result to `processed/imported/`. |

Successful state transition:

```text
enrichment_job.status: exported -> completed
enrichment_job.output_data: null -> validated result + batch_id + needs_review confidence
```

If a file is invalid, contains jobs from another batch, or a database write
fails, it remains in `processed/`. Correct the file and run `npm run import`
again. It is archived only after the database import succeeds.

## Folder and retry rules

```text
pending/<batch-id>.json
  Exists: waiting for the enrichment worker.

processed/<batch-id>.result.json
  Exists: waiting for Hogona to validate and import it, or requires correction.

processed/imported/<batch-id>.result.json
  Exists: imported successfully; Hogona will not process it again.
```

An exported database batch without a pending file can occur only if the file
write fails; the export script compensates by returning those jobs to
`pending`. A processed file is never deleted by the importer; it is archived
after a successful import for auditability.

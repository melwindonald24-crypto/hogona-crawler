# Hogona — discovery & manual enrichment pipeline

A focused data-discovery pipeline that collects place search results from Serper Places, stores immutable provider responses in PostgreSQL, and produces small manual-enrichment packets for human+LLM review. It's intended for data engineers and researchers who need verified, auditable place enrichment workflows.

**Status:** Active · **License:** MIT

---

**At a glance**
- **Project Type:** CLI / Data pipeline
- **Primary Users:** Data engineers, researchers, manual enrichment operators
- **Backend:** Node.js (ESM) + Sequelize
- **Database:** PostgreSQL
- **External APIs:** Serper Places

---

## Overview
Hogona avoids open web scraping and instead uses a small-number-of-sources approach: Serper Places is the single discovery adapter. Results are recorded verbatim as `raw_evidence` and later hand-edited or human-validated via `enrichment_job` packets. The pipeline emphasizes auditability, idempotence, and safe imports.

## Goals
- **Collect** reproducible provider payloads from Serper Places.
- **Persist** immutable evidence for audit and re-parsing.
- **Queue** unique candidate places for manual/LLM enrichment.
- **Validate** and import only schema-safe, citation-backed enrichment results.

### Non-Goals
- Automatic population of production place records (human review is required).
- Arbitrary website scraping or automated text‐generation without citations.

---

## Key Features
- **Resumable discovery jobs:** `discovery_job` records allow safe retries.
- **Immutable evidence:** `raw_evidence` stores provider JSON (JSONB).
- **Deduplicated enrichment queue:** stable `sourcePlaceId` prevents duplicates.
- **Small export batches** (1–10) for human + LLM processing.

---

## Quick User Flow

1. Run discovery to collect Serper Places evidence.
2. Convert discoveries into deduplicated enrichment jobs.
3. Export a small batch for manual/LLM enrichment.
4. Import validated JSON results and mark them for review.

Use the helpful entrypoint in [index.js](index.js) for command guidance.

---

## Architecture (high level)

User → CLI scripts → Backend services → PostgreSQL

- Discovery adapter: [services/discovery/serperPlacesService.js](services/discovery/serperPlacesService.js)
- Raw evidence writer: [services/discovery/RawEvidenceservice.js](services/discovery/RawEvidenceservice.js)
- Job & model definitions: [db/models/](db/models/)

---

## Important Files
- **Entry point:** [index.js](index.js)
- **Scripts:** [scripts/collectSerperKarnataka.js](scripts/collectSerperKarnataka.js), [scripts/queueSerperPlacesForManualEnrichment.js](scripts/queueSerperPlacesForManualEnrichment.js), [scripts/exportManualEnrichmentBatch.js](scripts/exportManualEnrichmentBatch.js), [scripts/importManualEnrichmentResults.js](scripts/importManualEnrichmentResults.js)
- **Discovery adapter:** [services/discovery/serperPlacesService.js](services/discovery/serperPlacesService.js)
- **Raw evidence writer:** [services/discovery/RawEvidenceservice.js](services/discovery/RawEvidenceservice.js)
- **Models:** [db/models/discovery_job.js](db/models/discovery_job.js), [db/models/raw_evidence.js](db/models/raw_evidence.js), [db/models/enrichment_job.js](db/models/enrichment_job.js)

---

## Data model (summary)
- **discovery_job:** A resumable Serper query with context (district/category) and state.
- **raw_evidence:** Immutable JSONB of provider response; indexed by `discovery_job_id`.
- **enrichment_job:** A deduplicated place handoff with lifecycle (`pending`, `exported`, `completed`).

---

## Getting started

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL accessible from `DATABASE_URL`
- Serper API key (set `SERPER_API_KEY`)

### Install

```bash
git clone <repo>
cd hogona-crawl
npm install
```

### Configure
Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
SERPER_API_KEY=your_serper_api_key
```

### Run pipeline stages

- Discover (collect Serper Places evidence):

```bash
npm run discover
```

- Create deduplicated enrichment jobs:

```bash
npm run queue
```

- Export a batch (1–10) for manual/LLM enrichment:

```bash
npm run export -- 3
```

- Import validated results (point to the JSON file):

```bash
npm run import -- tmp/manual-enrichment/results.json
```

---

## Configuration
- **DATABASE_URL:** PostgreSQL connection string (required)
- **SERPER_API_KEY:** Serper Places API key (required)

All other runtime options are driven by per-job `config` objects stored in `discovery_job` rows.

---

## Testing

Run unit tests (they avoid network/DB by design):

```bash
npm test
```

---

## Failure handling & safety
- External requests use timeouts and bubble HTTP errors.
- Discovery is resumable: completed `discovery_job` entries are skipped.
- Import validates schema and requires HTTP(S) citations for non-null claims before any DB write.

---

## Limitations
- Single discovery provider (Serper Places) — introduces provider bias.
- Not intended for high-frequency production updates — used for curated enrichment.

---

## Future improvements
- Add optional parallel discovery with rate limiting and retry backoff.
- Add automated integration tests against a local Postgres fixture.

---

## Key engineering decisions & trade-offs

- **Focused single-provider discovery (Serper Places)**
	- Decision: keep Serper Places as the sole discovery adapter on this branch.
	- Context: the `main` branch contained an earlier, multi-source pipeline that produced low-quality "junk" results and high maintenance cost; this branch intentionally narrows scope to improve signal and auditability.
	- Alternatives considered: (a) keep the multi-source pipeline and add complex filtering, (b) blend multiple vetted providers with consensus scoring.
	- Why chosen: single-provider approach reduces noise, simplifies parsing/validation, and makes manual enrichment tractable.
	- Trade-off: provider bias and a single point of failure; some valid places might be missed unless additional sources are reintroduced later.

- **Immutable raw evidence storage**
	- Decision: persist raw provider JSON in `raw_evidence` (JSONB) and never overwrite.
	- Why: reproducibility, audit trail, and ability to re-run different parsing/enrichment logic later.
	- Trade-off: increased storage and the need to manage retention or archival policies.

- **Manual/LLM-assisted enrichment (export/import) rather than fully automated ingestion**
	- Decision: export small, human-reviewable batches for LLM and manual operators; import only validated, citation-backed results.
	- Why: prevents automated poisoning of production place records and enforces citation requirements.
	- Trade-off: slower throughput and human/operator effort required, but much stronger data quality guarantees.

---

## Progress & Next Steps — Google Drive export/import (in progress)

Goal: automate the export of enrichment packets to Google Drive where an LLM operator (or automated LLM workflow you control) performs enrichment, then import results back into the database after validation.

Minimal implementation plan (safe, incremental):

1. Add an export module: `services/export/googleDriveExport.js` that creates the JSON batch and uploads it to a configured Drive folder.
	 - Use `googleapis` (Drive v3) and either a service account with a shared drive folder or an OAuth2 client for human accounts.
	 - Required env vars: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID` (or OAuth client secrets).
	 - Persist the exported file metadata (`fileId`, `sha256`, `exported_at`) on the `enrichment_job` rows to track provenance.

2. Decide how results are returned:
	 - Simple: operator downloads the file, runs LLM enrichment locally, then uses the existing `npm run import` to push results back.
	 - Automated: LLM writes a result file to the same Drive folder; the pipeline either (a) polls for a `results-<batch>.json` file or (b) receives a Drive push notification/webhook (requires a public HTTPS endpoint) and then runs the import flow.

3. Import safety: validate JSON schema, check `sha256`/checksum, ensure `enrichment_job` rows are still `exported`, verify HTTP(S) citations, then atomically write results and mark jobs `completed` or `needs_review`.

Security and operational notes:
- OAuth/service-account keys must be stored in environment variables and never committed. Use short-lived access where possible.
- Prefer a service account + shared drive for server-side automation to avoid interactive OAuth flows.
- Consider using signed URLs on S3 or a private Drive folder if you need to avoid Drive webhooks.

Alternatives and trade-offs:
- Drive webhook automation is robust but requires hosting a public webhook and handling auth; polling is simpler but less real-time.
- Using cloud storage (S3/GCS) with presigned URLs is easier for server-only pipelines and can simplify permissions.

Would you like me to implement the `googleDriveExport` module (upload + metadata tracking) next, or prepare an automated import webhook skeleton? I can start either one and include tests and example env setup.


## Contributing
- Fork, branch, test, and open a PR. See code in [scripts/](scripts/) and [services/](services/).

---

## License
MIT

---

Author: melwin


# Hogona Crawl

Hogona Crawl is the source-acquisition layer for a trip-planning product. Its
job is to turn unstructured travel information into traceable, deduplicated
evidence that can later be extracted into place candidates, reviewed, grouped,
and enriched.

The project does not try to decide which places belong in an itinerary. It
solves the earlier problem: finding plausible sources, collecting their content,
and preserving enough provenance to explain where every candidate came from.

## Contents

- [What the system does](#what-the-system-does)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Responsibilities and boundaries](#responsibilities-and-boundaries)
- [Data model and invariants](#data-model-and-invariants)
- [How work moves through the system](#how-work-moves-through-the-system)
- [Configuration](#configuration)
- [Installation](#installation)
- [Using the crawler from Node.js](#using-the-crawler-from-nodejs)
- [Provider discovery](#provider-discovery)
- [Testing](#testing)
- [Operational notes](#operational-notes)
- [Repository layout](#repository-layout)

## What the system does

Hogona Crawl has two entry paths:

1. **Crawling** starts from a URL in a `crawl_job`. Crawl4AI fetches the page,
   returns the page content and internal links, and Node.js can persist the page
   as raw evidence.
2. **Discovery** starts from a configured source in a `discovery_job`.
   Wikipedia and Geoapify adapters retrieve source material that can be stored
   as raw evidence without first forcing it into a final place schema.

Both paths converge at `raw_evidence`. That table is the provenance boundary:
the original content is retained, deduplicated by hash, and linked to exactly
one initiating job. Later stages create `gemma_extraction` records and group
possible duplicates into candidate clusters.

## Quick start

The commands below prepare the database schema and run one real crawl on
Windows PowerShell.

```powershell
npm.cmd install
py -3.13 -m venv .\crawlerPython\.venv
.\crawlerPython\.venv\Scripts\python.exe -m pip install -r .\crawlerPython\requirements.txt
.\crawlerPython\.venv\Scripts\crawl4ai-setup.exe
node index.js
.\crawlerPython\.venv\Scripts\python.exe .\crawlerPython\src\crawlerProcessing.py --url https://example.com
```

Before running `node index.js`, configure the database variables described in
[Configuration](#configuration) and enable PostGIS.

## Architecture

The flow diagram describes the intended processing pipeline from source
collection to final place records.

![Discovery workflow](docs/images/discovery-flow.png)

The current repository implements the acquisition and persistence foundation:
job models, provider adapters, a Crawl4AI worker, evidence storage, link
filtering, and link ranking. The extraction, clustering, and enrichment tables
are present in the data model, but their worker/orchestration implementations
are not part of this repository yet.

![Database schema](docs/images/database-schema.png)

## Responsibilities and boundaries

The project is intentionally split by responsibility. Each layer has one
reason to change, which keeps browser concerns, provider quirks, and database
rules from leaking into one another.

| Area | Owns | Does not own | Why this boundary exists |
| --- | --- | --- | --- |
| `db/models/` | Sequelize schema, relations, and model-level data validation | HTTP requests, browser execution, queue processing | Database rules remain reusable regardless of how a job was started. |
| `discovery/processingServices.js/` | Provider-specific request parameters and responses | Crawling, persistence, ranking, extraction | Wikipedia and Geoapify can change independently without affecting the crawler. |
| `discovery/RawEvidenceservice.js` | Content serialization, SHA-256 hashing, deduplication, and evidence creation | Choosing URLs or interpreting tourism data | Evidence is a durable audit record, not a crawl controller. |
| `crawlerPython/src/crawlerProcessing.py` | Browser-backed page retrieval and JSON output | Node.js database access and job status changes | Crawl4AI stays in the Python runtime it needs, while the database remains owned by Node.js. |
| `crawlerPython/crawlerJs/processing/` | Starting the Python worker and parsing its result | Browser logic or content extraction | Node.js gets a stable JavaScript interface without reimplementing the crawler. |
| `crawlerPython/crawlerJs/filter/` and `ranker/` | Link rejection and priority scoring | Fetching links or changing job state | Link-selection rules can evolve without changing the crawler transport. |

### Why Node.js and Python are separate

Node.js already owns this project's Sequelize models, PostgreSQL connection,
job records, and provider clients. Crawl4AI is a Python browser-crawling
library, so the crawler runs in a small Python environment under
`crawlerPython/.venv/`. Node.js invokes it as a subprocess and receives JSON on
standard output.

This avoids duplicating database code in Python and avoids making the Node.js
application depend on browser automation internals. The trade-off is process
startup cost and a strict JSON boundary: a crawler failure must be surfaced to
Node.js, and only serializable data can cross the boundary. The wrapper handles
that by rejecting empty output and adding the URL to any error it throws.

## Data model and invariants

| Model | Purpose | Important rules |
| --- | --- | --- |
| `crawl_job` | Queues a URL for crawling | Status is `pending`, `running`, `completed`, or `failed`; higher `priority` values are selected first. |
| `discovery_job` | Stores a provider and provider-specific configuration | Status uses the same lifecycle as a crawl job; `config` is JSONB. |
| `raw_evidence` | Stores raw page or provider content | `content_hash` is unique; model validation requires exactly one parent: a crawl job or a discovery job. |
| `gemma_extraction` | Stores a place candidate extracted from one evidence record | Holds categories, coordinates, confidence, structured extraction data, and `EXTRACTED` or `REVIEW` status. |
| `canidate_cluster` | Represents a proposed group of duplicate place candidates | Uses `PENDING`, `READY`, and `COMPLETED` status. The existing table name is intentionally preserved for database compatibility. |
| `cluster_members` | Associates an extraction with a candidate cluster | Stores the extraction-to-cluster match score. |

The model-level "exactly one parent job" validation protects calls made through
Sequelize. Direct SQL writes must respect the same rule; there is no database
`CHECK` constraint or migration in this repository that enforces it outside the
application.

## How work moves through the system

### Crawl path

1. Application code creates a `crawl_job` with a source URL and optional
   priority.
2. `CrawlJobService.getPendingCrawlJobs()` selects pending jobs ordered by
   priority.
3. `CrawlService.crawl(url)` launches `crawlerProcessing.py` using the Python
   executable inside `crawlerPython/.venv/`.
4. Crawl4AI returns one document containing the page's Markdown content and a
   list of internal links.
5. `CrawlFilter` rejects utility pages such as privacy, terms, login, and
   support pages. `CrawlPriority` scores the remaining links using URL and
   anchor-text travel keywords.
6. `RawEvidenceService.createRawEvidence()` serializes content when necessary,
   hashes it with SHA-256, returns an existing duplicate when found, or creates
   a new `raw_evidence` row.

### Discovery path

1. Application code creates a `discovery_job` with a `source` and `config`.
2. A provider adapter uses that configuration to make its request.
3. The provider response is retained as source material and can be passed to
   `RawEvidenceService` with the discovery job ID.

The adapters deliberately keep provider payloads close to their original form.
Wikipedia returns page content with its source URL; Geoapify returns GeoJSON
features. This preserves provenance and keeps the acquisition layer from
prematurely inventing a single place schema. Normalizing those payloads belongs
to the extraction/enrichment stage.

### Job state transitions

Both job models use the same lifecycle:

```text
pending -> running -> completed
                   -> failed
```

The services provide create, fetch, and update primitives. A continuously
running worker that claims jobs, retries failures, and performs these
transitions end-to-end is an application-level composition step; it is not
implemented as a standalone process in this repository.

## Configuration

Create `.env` in the repository root. It is excluded from version control.

### PostgreSQL

Use one connection string:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
```

or provide the individual values used by `db/database.js`:

```env
DB_NAME=hogona_crawl
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
```

PostGIS is required because `gemma_extraction.co_ordinates` is stored as a
PostgreSQL `GEOMETRY(POINT, 4326)` value:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Geoapify

Set the current variable name:

```env
GEOAPIFY_API_KEY=your_geoapify_key
```

For compatibility with existing local setups, the Geoapify adapter also reads
`GEOMAPIFY_API_KEY` when `GEOAPIFY_API_KEY` is absent. New configuration should
use `GEOAPIFY_API_KEY`.

## Installation

### Requirements

- Node.js 18 or later
- Python 3.13 for the crawler virtual environment
- PostgreSQL with PostGIS enabled
- A Geoapify API key only when using the Geoapify discovery adapter

### Node.js dependencies

```powershell
npm.cmd install
```

`npm.cmd` is used in the examples because some Windows PowerShell setups block
the `npm.ps1` shim through execution policy. On systems without that policy,
`npm install` is equivalent.

### Python crawler environment

```powershell
py -3.13 -m venv .\crawlerPython\.venv
.\crawlerPython\.venv\Scripts\python.exe -m pip install --upgrade pip
.\crawlerPython\.venv\Scripts\python.exe -m pip install -r .\crawlerPython\requirements.txt
.\crawlerPython\.venv\Scripts\crawl4ai-setup.exe
```

`crawl4ai-setup.exe` downloads the browser runtime used by Crawl4AI. The
virtual environment belongs only to `crawlerPython/`; it does not turn the
Node.js project into a Python project and it is ignored by Git.

### Initialize the database

```powershell
node index.js
```

This authenticates to PostgreSQL and calls `sequelize.sync()`. Use it only
against a database where automatic schema synchronization is acceptable.
Production schema changes should be introduced through migrations before this
project is connected to a shared database.

## Using the crawler from Node.js

The Python worker can be called directly for debugging:

```powershell
.\crawlerPython\.venv\Scripts\python.exe .\crawlerPython\src\crawlerProcessing.py --url https://example.com
```

It writes a single JSON object to standard output:

```json
{
  "documents": [
    {
      "sourceUrl": "https://example.com",
      "content": "# Example Domain\\n..."
    }
  ],
  "links": [
    {
      "url": "https://example.com/another-page",
      "text": "Another page"
    }
  ]
}
```

Application code should use the Node.js wrapper instead of spawning Python
itself:

```js
import CrawlService from "./crawlerPython/crawlerJs/processing/runCrawlerService.js";

const result = await CrawlService.crawl("https://example.com");
console.log(result.documents[0].content);
```

The worker accepts only absolute `http` or `https` URLs. Invalid URLs are
rejected before the browser starts.

### Composing a crawl and evidence write

There is deliberately no hidden background worker in this repository. The
application that owns scheduling composes the small services explicitly:

```js
import CrawlJobService from "./crawlerPython/crawlerJs/crawlerService.js";
import CrawlService from "./crawlerPython/crawlerJs/processing/runCrawlerService.js";
import RawEvidenceService from "./discovery/RawEvidenceservice.js";

const crawlJob = await CrawlJobService.createCrawlJob({
  sourceUrl: "https://example.com",
  priority: 10,
});

await CrawlJobService.updateStatus({ crawlJob, status: "running" });

try {
  const { documents } = await CrawlService.crawl(crawlJob.source_url);

  for (const document of documents) {
    await RawEvidenceService.createRawEvidence({
      crawlJobId: crawlJob.id,
      sourceUrl: document.sourceUrl,
      content: document.content,
    });
  }

  await CrawlJobService.updateStatus({ crawlJob, status: "completed" });
} catch (error) {
  await CrawlJobService.updateStatus({ crawlJob, status: "failed" });
  throw error;
}
```

This explicit composition makes retries, concurrency control, rate limiting,
and observability policy decisions visible to the application that owns them.

## Provider discovery

### Wikipedia

`wikipediaService.getDocuments(discoveryJob)` expects a `config.query` value.
It searches Wikipedia and returns matching page data, including the canonical
page URL where Wikipedia supplies it.

```js
const discoveryJob = {
  config: { query: "waterfalls in Kerala" },
};
```

### Geoapify

`geMapifyService.getDocuments(discoveryJob)` expects a Geoapify `placeId` and
at least one category. It rejects invalid configuration or a missing API key
before it makes a network request.

```js
const discoveryJob = {
  config: {
    placeId: "country:in",
    categories: ["tourism.attraction"],
  },
};
```

## Testing

Run the Node.js utility tests:

```powershell
npm.cmd test
```

The current test suite covers link blacklisting, text normalization, and link
priority scoring. A live crawler smoke test needs the prepared Python
environment, Crawl4AI browser runtime, and network access.

## Operational notes

- **Content deduplication is global.** Two jobs that produce identical content
  return the same `raw_evidence` row because `content_hash` is unique. This
  reduces reprocessing, but it also means source-specific duplicate tracking
  belongs in a later design if it is required.
- **The crawler starts a browser process.** It is more capable than a basic
  HTTP request client, but it has higher startup and memory cost. Process jobs
  in batches or keep a worker alive when throughput becomes important.
- **No retry policy is built in.** Job status can be marked `failed`, but retry
  count, backoff, and ownership/locking should be added by the scheduling
  application.
- **`sequelize.sync()` is a bootstrap tool.** It is convenient during local
  development; migrations are the safer production mechanism.

## Repository layout

```text
hogona-crawl/
├── db/
│   ├── database.js                         PostgreSQL connection setup
│   └── models/                             schema definitions and relations
├── discovery/
│   ├── DiscoveryJobService.js              discovery-job persistence service
│   ├── RawEvidenceservice.js               hash, deduplicate, and store evidence
│   └── processingServices.js/
│       ├── wikipediaService.js              Wikipedia adapter
│       └── geoApifyService.js               Geoapify adapter
├── crawlerPython/
│   ├── .venv/                              local Python environment, ignored
│   ├── requirements.txt                    Crawl4AI dependency list
│   ├── src/crawlerProcessing.py            browser crawler and JSON CLI
│   └── crawlerJs/
│       ├── crawlerService.js               crawl-job persistence service
│       ├── processing/runCrawlerService.js Node-to-Python subprocess wrapper
│       ├── filter/crawlFilter.js           low-value URL filter
│       └── ranker/                         text normalization and URL scoring
├── docs/images/                            pipeline and schema diagrams
├── test/                                   Node.js utility tests
└── index.js                                database bootstrap entry point
```

## License

ISC, as declared in `package.json`.

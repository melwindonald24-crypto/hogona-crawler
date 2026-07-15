# Hogona Crawl

Hogona Crawl is the crawling and discovery backend for a trip planning app. It collects travel-related pages and API results, stores raw evidence, extracts possible tourist places, and prepares duplicate place mentions for later clustering, enrichment, and review.

The project is mainly a Node.js app with Sequelize/PostgreSQL models. It also has an isolated Python crawler under `crawlerPython/` that uses Crawl4AI and is called from Node as a subprocess.

## Pipeline Overview

1. Create crawl jobs from source URLs or discovery results.
2. Crawl pages with the Python Crawl4AI worker.
3. Rank and filter discovered links in Node.
4. Store crawled page content as `raw_evidence`.
5. Run extraction to produce `gemma_extraction` tourist-place candidates.
6. Group duplicates into `canidate_cluster` through `cluster_members`.
7. Enrich and resolve final place records for the trip planning app.

![Tourist place discovery flow](docs/images/discovery-flow.png)

## Database Schema

The schema stores jobs, raw evidence, extraction results, and candidate duplicate-place clusters.

![Database schema](docs/images/database-schema.png)

## Project Structure

```text
hogona-crawl/
  db/
    database.js
    models/
      crawl_job.js
      discovery_job.js
      raw_evidence.js
      gemma_extraction.js
      canidate_cluster.js
      cluster_member.js
      dbindex.js
  discovery/
    DiscoveryJobService.js
    RawEvidenceservice.js
    processingServices.js/
      wikipediaService.js
      geoApifyService.js
  crawlerPython/
    .venv/                         # Python virtual environment, ignored by Git
    requirements.txt               # Python crawler dependencies
    src/
      crawlerProcessing.py         # Crawl4AI script
    crawlerJs/
      crawlerService.js            # Crawl job DB service
      processing/
        runCrawlerService.js       # Node wrapper around Python subprocess
      filter/
        crawlFilter.js             # Link blacklist filter
      ranker/
        crawlPriority.js           # Link scoring
        textNormalizer.js          # Text token/stem helper
  docs/images/
    database-schema.png
    discovery-flow.png
  index.js                         # Database bootstrap/sync script
  package.json
```

## Main Components

### Node Database Layer

`db/database.js` creates the Sequelize connection using either `DATABASE_URL` or separate database variables. `index.js` imports the models, authenticates with PostgreSQL, and runs `sequelize.sync()`.

The current tables are:

- `crawl_job`: crawl queue entries with `source_url`, `status`, and `priority`.
- `discovery_job`: configurable discovery jobs with `source`, `status`, and JSONB `config`.
- `raw_evidence`: deduplicated raw crawled/discovered content, keyed by `content_hash`.
- `gemma_extraction`: extracted tourist-place candidates with name, category, coordinates, JSONB details, confidence, and review status.
- `canidate_cluster`: candidate duplicate-place groups.
- `cluster_members`: join table connecting extractions to clusters with `match_score`.

### Discovery Services

`discovery/processingServices.js/wikipediaService.js` fetches Wikipedia documents for a configured query.

`discovery/processingServices.js/geoApifyService.js` fetches Geoapify places for configured `placeId` and `categories`.

`discovery/RawEvidenceservice.js` is intended to normalize content, hash it, avoid duplicates, and write `raw_evidence`.

### Python Crawler

`crawlerPython/src/crawlerProcessing.py` runs Crawl4AI:

```powershell
.\crawlerPython\.venv\Scripts\python.exe .\crawlerPython\src\crawlerProcessing.py --url https://example.com
```

It returns JSON shaped like:

```json
{
  "documents": [
    {
      "sourceUrl": "https://example.com",
      "content": "..."
    }
  ],
  "links": []
}
```

### Node To Python Subprocess

`crawlerPython/crawlerJs/processing/runCrawlerService.js` uses `python-shell` to execute the Python crawler with the virtualenv Python executable:

```js
import CrawlService from "./crawlerPython/crawlerJs/processing/runCrawlerService.js";

const result = await CrawlService.crawl("https://example.com");
```

The virtual environment stays in `crawlerPython/.venv/` and should not be committed.

### Crawl Filtering And Ranking

`crawlerPython/crawlerJs/filter/crawlFilter.js` is intended to reject low-value URLs such as login, privacy, terms, contact, and support pages.

`crawlerPython/crawlerJs/ranker/crawlPriority.js` scores discovered links using travel and high-value tourist-place keywords such as `waterfalls`, `trek`, `beach`, `temple`, `monument`, `hidden`, and `viewpoint`.

## Requirements

- Node.js and npm
- Python 3.13 for the current crawler venv
- PostgreSQL
- PostGIS enabled in the target database

Node dependencies include:

- `sequelize`
- `pg`
- `pg-hstore`
- `dotenv`
- `axios`
- `python-shell`

Python dependencies are listed in `crawlerPython/requirements.txt` and currently include:

- `crawl4ai`

## Environment Variables

Create a local `.env` file in the project root. It is ignored by Git.

Use either:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
```

Or:

```env
DB_NAME=hogona_crawl
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
```

Geoapify discovery also expects:

```env
GEOMAPIFY_API_KEY=your_geoapify_key
```

Because `gemma_extraction.co_ordinates` uses `GEOMETRY("POINT", 4326)`, enable PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Setup

Install Node dependencies:

```bash
npm install
```

Create and prepare the Python crawler environment:

```powershell
py -3.13 -m venv .\crawlerPython\.venv
.\crawlerPython\.venv\Scripts\python.exe -m pip install -r .\crawlerPython\requirements.txt
.\crawlerPython\.venv\Scripts\crawl4ai-setup.exe
```

Use `python -m pip` through the venv executable instead of plain `pip`, so installs stay inside `crawlerPython/.venv`.

## Run

Sync the database schema:

```bash
node index.js
```

Run a crawler smoke test:

```powershell
.\crawlerPython\.venv\Scripts\python.exe .\crawlerPython\src\crawlerProcessing.py --url https://example.com
```

## Documentation And Ignore Files

There is one project README: `README.md`.

There is one project `.gitignore`: `.gitignore`.

You may also see `crawlerPython/.venv/.gitignore`; that file is generated by Python inside the virtual environment. It is not project documentation, and the whole `.venv/` folder is ignored by the root `.gitignore`.

## Current Implementation Notes

- `db/models/dbindex.js` defines associations, but `index.js` currently imports model files directly instead of importing `dbindex.js`.
- `db/models/dbindex.js` uses extensionless imports; with `"type": "module"`, those imports should include `.js` before the file is used.
- `gemma_extraction.js` uses `allowedNull`; Sequelize expects `allowNull`.
- `RawEvidenceservice.js` references `crypto` but does not import it, and its string check should compare `typeof content`.
- `geoApifyService.js` assigns `LIMIT=100` without declaring it.
- `crawlFilter.js` uses `new set`; JavaScript expects `new Set`.
- `textNormalizer.js` currently has a malformed class method layout, but it is clearly intended to expose a `normalize(text)` helper.
- `crawlerPython/crawlerJs/crawlerService.js` imports `../db/models/crawl_job`, but from its current folder that path does not point to the root `db/` directory.

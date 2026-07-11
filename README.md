# Hogona Crawl

Hogona Crawl is the data discovery layer for a trip planning application. Its job is to collect raw travel-related evidence from crawl sources and discovery sources, extract tourist-place candidates from that evidence, group duplicate mentions of the same place, and prepare the resulting place data for later enrichment and review.

At the moment, this repository contains the Node.js/Sequelize database foundation for that pipeline: PostgreSQL connection setup, schema models, relationships, and a bootstrap script that authenticates and synchronizes the database.

## Pipeline Overview

The intended flow is:

1. Collect URLs, OSM API results, or other travel-source documents.
2. Store every raw document as `raw_evidence`.
3. Run extraction over batches of raw evidence to identify possible tourist places.
4. Store extracted place candidates in `gemma_extraction`.
5. Send low-confidence or incomplete extraction results to review.
6. Group duplicate place mentions into candidate clusters.
7. Enrich and resolve each cluster into a final place record for the trip planning app.

![Tourist place discovery flow](docs/images/discovery-flow.png)

## Database Schema

The current schema is centered around raw evidence, extracted place candidates, and duplicate grouping.

![Database schema](docs/images/database-schema.png)

## Data Model

### `crawl_job`

Represents a crawler run that collects raw documents from a named source.

Key fields:

- `id`: UUID primary key
- `source`: source name or source identifier
- `status`: `pending`, `running`, `completed`, or `failed`
- `created_at`, `updated_at`: managed by Sequelize

Relationship:

- One `crawl_job` can produce many `raw_evidence` rows.

### `discovery_job`

Represents a configurable discovery run. This is useful for source-specific searches, API pulls, OSM discovery passes, or future location/category based discovery.

Key fields:

- `id`: UUID primary key
- `source`: source name or source identifier
- `status`: `pending`, `running`, `completed`, or `failed`
- `config`: JSONB configuration for the discovery pass
- `created_at`, `updated_at`: managed by Sequelize

Relationship:

- One `discovery_job` can produce many `raw_evidence` rows.

### `raw_evidence`

Stores the raw text/document evidence collected by a crawl job or discovery job.

Key fields:

- `id`: UUID primary key
- `crawl_job_id`: optional link to `crawl_job`
- `discovery_job_id`: optional link to `discovery_job`
- `source_url`: original URL or source location
- `content`: raw document text
- `content_hash`: unique hash used to deduplicate repeated crawls
- `created_at`, `updated_at`: managed by Sequelize

Relationship:

- One `raw_evidence` row can produce many `gemma_extraction` rows.

### `gemma_extraction`

Stores extracted tourist-place candidates from raw evidence.

Key fields:

- `id`: UUID primary key
- `raw_evidence_id`: source evidence row
- `name`: extracted place name
- `category`: array of place categories
- `co_ordinates`: PostGIS point in SRID `4326`
- `extracted_data`: JSONB payload for structured extraction details
- `confidence`: extraction confidence score
- `status`: `EXTRACTED` or `REVIEW`
- `created_at`: managed by Sequelize

Relationship:

- One `gemma_extraction` belongs to one `raw_evidence` row.
- One `gemma_extraction` can be assigned to one `cluster_member` row.

### `canidate_cluster`

Groups duplicate or near-duplicate extracted places that likely refer to the same real-world tourist place.

Key fields:

- `id`: UUID primary key
- `proposed_name`: proposed canonical place name for the cluster
- `status`: `PENDING`, `READY`, or `COMPLETED`
- `created_at`, `updated_at`: managed by Sequelize

Relationship:

- One `canidate_cluster` can contain many `cluster_member` rows.

Note: the current model and table name use `canidate_cluster`. If this is meant to be `candidate_cluster`, rename it carefully with a migration before production use.

### `cluster_members`

Join table connecting extracted place candidates to a candidate cluster.

Key fields:

- `gemma_extraction_id`: primary key and foreign key to `gemma_extraction`
- `cluster_id`: foreign key to `canidate_cluster`
- `match_score`: score describing how strongly the extraction matches the cluster

## Project Structure

```text
hogona-crawl/
  db/
    database.js                 # Sequelize/PostgreSQL connection
    models/
      crawl_job.js              # Crawl job model
      discovery_job.js          # Discovery job model
      raw_evidence.js           # Raw collected evidence
      gemma_extraction.js       # Extracted tourist-place candidates
      canidate_cluster.js       # Candidate duplicate-place cluster
      cluster_member.js         # Cluster membership join table
      dbindex.js                # Association definitions
  docs/
    images/
      database-schema.png       # Database diagram
      discovery-flow.png        # Discovery pipeline diagram
  index.js                      # Database bootstrap/sync script
  package.json
```

## Requirements

- Node.js
- npm
- PostgreSQL
- PostGIS extension enabled for geometry support

The code uses:

- `sequelize` for ORM models
- `pg` and `pg-hstore` for PostgreSQL access
- `dotenv` for local environment variables

## Environment Variables

Create a local `.env` file in the project root. The `.env` file is intentionally ignored by Git.

Use either a single database URL:

```env
DATABASE_URL=postgres://user:password@localhost:5432/hogona_crawl
```

Or separate database settings:

```env
DB_NAME=hogona_crawl
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
```

Because `gemma_extraction.co_ordinates` uses `GEOMETRY("POINT", 4326)`, the target database should have PostGIS enabled:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Installation

```bash
npm install
```

## Run

```bash
node index.js
```

The bootstrap script:

1. Loads environment variables from `.env`.
2. Connects to PostgreSQL.
3. Authenticates the connection.
4. Synchronizes the Sequelize models with the database.
5. Prints the registered models.

## Current Implementation Notes

- `index.js` currently imports the model files directly and runs `sequelize.sync()`.
- `db/models/dbindex.js` defines associations between models, but it is not currently imported by `index.js`.
- Since this project uses ESM with `"type": "module"`, imports in `db/models/dbindex.js` should include `.js` extensions before that file is used directly.
- `gemma_extraction.js` uses `allowedNull` in two fields; Sequelize expects `allowNull`.
- The repository currently defines the persistence layer. Crawler workers, extraction workers, clustering workers, enrichment, and final place-table writing are represented in the flow diagram but are not implemented in this codebase yet.

## Git Hygiene

The project `.gitignore` excludes local secrets, dependencies, logs, cache/build output, local database files, and editor/OS noise. Keep `package.json`, `package-lock.json`, source files, and documentation committed.

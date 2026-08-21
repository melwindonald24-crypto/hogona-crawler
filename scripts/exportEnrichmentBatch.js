import "dotenv/config";
import sequelize from "../db/database.js";
import { ensureEnrichmentJobSchema } from "../db/ensureEnrichmentJobSchemaMigration.js";
import enrichmentJob from "../db/models/enrichment_job.js";
import { writePendingBatch } from "../services/drive/driveSync.js";
import { createBatchId } from "../services/enrichment/batchId.js";
import {
  claimPendingJobs,
  releaseBatch,
} from "../services/enrichment/batchJobs.js";
import { buildBatchPayload } from "../services/enrichment/enrichmentContract.js";

const limit = Number.parseInt(process.argv[2] ?? "3", 10);

async function main() {
  if (!Number.isInteger(limit) || limit < 1 || limit > 3)
    throw new Error("Provide a batch size from 1 to 3.");

  await ensureEnrichmentJobSchema();
  const batchId = createBatchId();
  const jobs = await claimPendingJobs(enrichmentJob, batchId, limit);
  if (jobs.length === 0) {
    console.log("No pending places to export.");
    process.exit(0);
  } 
  try {
    const filePath = await writePendingBatch(
      batchId,
      buildBatchPayload(jobs, batchId),
    );
    console.log(`Batch ${batchId} is ready at ${filePath}.`);
  } catch (error) {
    await releaseBatch(enrichmentJob, batchId);
    throw error;
  }
}

const start = async () => {
  try {
    await sequelize.authenticate();
    while (true) {
      try {
        await main();
      } catch (e) {
        console.error(`Export failed: ${e.message}`);
        process.exitCode = 1;
      }
    }
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
  } finally {
    await sequelize.close();
    console.log("Database connection closed cleanly.");
  }
};

start();

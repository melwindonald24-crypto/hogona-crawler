import "dotenv/config";
import sequelize from "../db/database.js";
import { ensureEnrichmentJobSchema } from "../db/ensureEnrichmentJobSchemaMigration.js";
import enrichmentJob from "../db/models/enrichment_job.js";
import {
  archiveCompletedBatch,
  listCompletedBatchFiles,
  paths,
  readCompletedBatch,
} from "../services/drive/driveSync.js";
import { importCompletedBatch } from "../services/enrichment/batchJobs.js";
import { validateCompletedBatch } from "../services/enrichment/enrichmentContract.js";

async function main() {
  await sequelize.authenticate();
  await ensureEnrichmentJobSchema();
  const files = await listCompletedBatchFiles();
  if (files.length === 0)
    return console.log(`No completed batches found in ${paths().processed}.`);
  let imported = 0;
  for (const filename of files) {
    try {
      const batch = validateCompletedBatch(await readCompletedBatch(filename));
      imported += await importCompletedBatch(enrichmentJob, batch);
      await archiveCompletedBatch(filename);
      console.log(`Imported ${filename}.`);
    } catch (error) {
      console.error(`Left ${filename} in processed/: ${error.message}`);
    }
  }
  console.log(`Imported ${imported} place result(s).`);
}

main()
  .catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());

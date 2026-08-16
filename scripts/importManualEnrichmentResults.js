import "dotenv/config";
import { readFile } from "node:fs/promises";

import sequelize from "../db/database.js";
import enrichment_job from "../db/models/enrichment_job.js";
import { validateImportedResults } from "../services/enrichment/manualEnrichment.js";

const resultFile = process.argv[2];

async function main() {
    if (!resultFile) {
        throw new Error("Usage: node scripts/importManualEnrichmentResults.js <results-file.json>");
    }

    const results = validateImportedResults(JSON.parse(await readFile(resultFile, "utf8")));
    await sequelize.authenticate();
    await enrichment_job.sync();

    let imported = 0;
    for (const result of results) {
        const output_data = { ...result, confidence: "needs_review" };
        const [updated] = await enrichment_job.update(
            { output_data, status: "completed" },
            { where: { id: result.job_id, status: "exported" } },
        );
        if (updated === 0) {
            throw new Error(`No exported enrichment job found for ${result.job_id}.`);
        }
        imported += 1;
    }

    console.log(`Imported ${imported} manual enrichment result(s).`);
}

main()
    .catch((error) => {
        console.error(`Import failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });

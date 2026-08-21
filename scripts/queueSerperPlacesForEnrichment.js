import "dotenv/config";
import sequelize from "../db/database.js";
import { ensureEnrichmentJobSchema } from "../db/ensureEnrichmentJobSchemaMigration.js";
import discoveryJob from "../db/models/discovery_job.js";
import rawEvidence from "../db/models/raw_evidence.js";
import enrichmentJob from "../db/models/enrichment_job.js";
import { parseSerperResponse, sourcePlaceId } from "../services/enrichment/enrichmentContract.js";

async function main() {
    await sequelize.authenticate();
    await ensureEnrichmentJobSchema();

    const serperJobs = await discoveryJob.findAll({
        where: { source: "serper", status: "completed" },
        attributes: ["id", "config"],
    });
    const evidence = await rawEvidence.findAll({
        where: { discovery_job_id: serperJobs.map((job) => job.id) },
        attributes: ["id", "discovery_job_id", "content"],
    });
    const districtByJobId = new Map(serperJobs.map((job) => [job.id, job.config?.district ?? null]));
    const categoryByJobId = new Map(serperJobs.map((job) => [job.id, job.config?.category ?? null]));

    let created = 0;
    for (const row of evidence) {
        let places;
        try {
            places = parseSerperResponse(row.content);
        } catch {
            console.warn(`Skipped invalid JSON raw_evidence ${row.id}.`);
            continue;
        }
        for (const place of places) {
            const placeName = place.title ?? place.name;
            if (!placeName) {
                console.warn(`Skipped unnamed Serper result in raw_evidence ${row.id}.`);
                continue;
            }
            const [, wasCreated] = await enrichmentJob.findOrCreate({
                where: { source_place_id: sourcePlaceId(place) 
                },
                defaults: {
                    raw_evidence_id: row.id,
                    source_place_id: sourcePlaceId(place),
                    place_name: placeName,
                    district: districtByJobId.get(row.discovery_job_id),
                    category: categoryByJobId.get(row.discovery_job_id),
                    input_data: { serper_metadata: place },
                },
            });
            if (wasCreated) created += 1;
        }
    }
    console.log(`Queued ${created} new places for Drive enrichment.`);
}

main()
    .catch((error) => { console.error(`Queueing failed: ${error.message}`); process.exitCode = 1; })
    .finally(() => sequelize.close());

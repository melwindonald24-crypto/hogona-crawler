import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sequelize from "../db/database.js";
import enrichment_job from "../db/models/enrichment_job.js";
import { chatGptPacket } from "../services/enrichment/manualEnrichment.js";

const limit = Number.parseInt(process.argv[2] ?? "3", 10);

async function main() {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
        throw new Error("Provide a batch size from 1 to 10.");
    }

    await sequelize.authenticate();
    await enrichment_job.sync();

    const jobs = await enrichment_job.findAll({
        where: { status: "pending" },
        order: [["created_at", "ASC"]],
        limit,
    });

    if (jobs.length === 0) {
        console.log("No pending places to export.");
        return;
    }

    const packet = chatGptPacket(jobs);
    const directory = path.resolve("tmp", "manual-enrichment");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(directory, `batch-${timestamp}.json`);

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
    await enrichment_job.update({ status: "exported" }, { where: { id: jobs.map((job) => job.id) } });

    console.log(`Created ${filePath}. Paste its contents into ChatGPT and save the returned JSON array as a results file.`);
}

main()
    .catch((error) => {
        console.error(`Export failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });

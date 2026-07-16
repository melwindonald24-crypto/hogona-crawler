import crawlBatch from "./batcher/crawlJobBatcher.js";
import discoveryBatch from "./batcher/discoverJobBatcher.js";
import sequelize from "./db/database.js";
import "./db/models/dbindex.js";

async function executeBatches() {
    const summaries = await Promise.all([
        crawlBatch.start(10),
        discoveryBatch.start(10),
    ]);

    }


async function main() {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
        await sequelize.sync();
        console.log("Database synchronized successfully.");
        await executeBatches();
    } catch (error) {
        console.error("Pipeline execution failed:", error);
        process.exitCode = 1;
    }
}

main();

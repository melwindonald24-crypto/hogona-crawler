import { DataTypes } from "sequelize";
import sequelize from "./database.js";
import enrichmentJob from "./models/enrichment_job.js";

//migrations
export async function ensureEnrichmentJobSchema() {
    const queryInterface = sequelize.getQueryInterface();
    
    if (!(await queryInterface.tableExists("enrichment_job"))) {
        await enrichmentJob.sync();
        return;
    }
    const columns = await queryInterface.describeTable("enrichment_job");
    if (!columns.batch_id) {
        await queryInterface.addColumn("enrichment_job", "batch_id", { type: DataTypes.STRING, allowNull: true });
    }
    const indexes = await queryInterface.showIndex("enrichment_job");
    if (!indexes.some((index) => index.name === "enrichment_job_batch_id")) {
        await queryInterface.addIndex("enrichment_job", ["batch_id"], { name: "enrichment_job_batch_id" });
    }
}

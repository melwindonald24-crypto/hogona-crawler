import canidate_cluster from "./canidate_cluster.js";
import cluster_member from "./cluster_member.js";
import crawl_job from "./crawl_job.js";
import discovery_job from "./discovery_job.js";
import gemma_extraction from "./gemma_extraction.js";
import raw_evidence from "./raw_evidence.js";

//crawl_job 1:N raw_evidence
crawl_job.hasMany(raw_evidence, { foreignKey: "crawl_job_id" });
raw_evidence.belongsTo(crawl_job, { foreignKey: "crawl_job_id" });

//discovery_job 1:N raw_evidence
discovery_job.hasMany(raw_evidence, { foreignKey: "discovery_job_id" });
raw_evidence.belongsTo(discovery_job, { foreignKey: "discovery_job_id" });  


//raw_evidence 1:N gemma_extraction
raw_evidence.hasMany(gemma_extraction, { foreignKey: "raw_evidence_id" });
gemma_extraction.belongsTo(raw_evidence, { foreignKey: "raw_evidence_id" });

//canidate_cluster 1:N cluster_member
canidate_cluster.hasMany(cluster_member, { foreignKey: "cluster_id" });
cluster_member.belongsTo(canidate_cluster, { foreignKey: "cluster_id" });

//gemma_extraction 1:1 cluster_member
gemma_extraction.hasOne(cluster_member, { foreignKey: "gemma_extraction_id" });
cluster_member.belongsTo(gemma_extraction, { foreignKey: "gemma_extraction_id" });

export {
    canidate_cluster,
    cluster_member,
    crawl_job,
    discovery_job,
    gemma_extraction,
    raw_evidence,
};

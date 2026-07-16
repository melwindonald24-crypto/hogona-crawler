import discoveryJobService from "../services/discovery/discoveryJobService.js";
import discoveryProcessor from "./helpers/DiscoveryProcessor.js";

class discoveryBatch {
    static async start(limit = 10) {
        

        while (true) {
            const jobs = await discoveryJobService.getPendingJobs(limit);
            if (jobs.length === 0) {
                return summary;
            }

            const results = await Promise.all(jobs.map((job) => this.#processJob(job)));
         
        }
    }

    static async #processJob(job) {
        try {
            await discoveryJobService.updateStatus({ Job: job, status: "running" });
            await discoveryProcessor.process(job);
            await discoveryJobService.updateStatus({ Job: job, status: "completed" });
            return true;
        } catch (error) {
            await discoveryJobService.updateStatus({ Job: job, status: "failed" });
            console.error(`Discovery job ${job.id} failed:`, error);
            return false;
        }
    }
}

export default discoveryBatch;

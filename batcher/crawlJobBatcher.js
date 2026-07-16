import crawlJobService from "../services/crawlerPython/crawlerJs/crawlJobService.js";
import crawlProcessor from "./helpers/CrawlProccesor.js";

class crawlBatch {
    static async start(limit = 10) {

        while (true) {
            const jobs = await crawlJobService.getPendingCrawlJobs(limit);
            if (jobs.length === 0) {
                return 
            }

            await Promise.all(jobs.map((job) => this.#processJob(job)));
          
        }
    }

    static async #processJob(job) {
        try {
            await crawlJobService.updateStatus({ Job: job, status: "running" });
            await crawlProcessor.process(job);
            await crawlJobService.updateStatus({ Job: job, status: "completed" });
            return true;
        } catch (error) {
            await crawlJobService.updateStatus({ Job: job, status: "failed" });
            console.error(`Crawl job ${job.id} failed:`, error);
            return false;
        }
    }
}

export default crawlBatch;

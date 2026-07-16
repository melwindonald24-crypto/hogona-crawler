import crawlJobService from "../../services/crawlerPython/crawlerJs/crawlJobService.js";
import CrawlFilter from "../../services/crawlerPython/crawlerJs/filter/crawlFilter.js";
import CrawlerService from "../../services/crawlerPython/crawlerJs/processing/CrawlerService.js";
import CrawlPriority from "../../services/crawlerPython/crawlerJs/ranker/crawlPriority.js";
import rawEvidenceService from "../../services/discovery/RawEvidenceservice.js";

class crawlProcessor {
    static async process(job) {
        
        const result = await CrawlerService.crawl(job.source_url);
        if (!result || typeof result.documents !== "string") {
            throw new Error("Crawler returned an invalid document payload.");
        }

        await Promise.all([
            rawEvidenceService.createRawEvidence({
                crawlJobId: job.id,
                sourceUrl: job.source_url,
                content: result.documents,
            }),
            result.links && this.#urlProcessor(result.links),
        ]);

        
    }

    static async #urlProcessor(links) {
        const seenUrls = new Set();
        const writes = links
            .filter((link) => {
                const url = link?.url;
                if (!url || seenUrls.has(url) || CrawlFilter.isBlacklisted(url)) {
                    return false;
                }

                seenUrls.add(url);
                return true;
            })
            .map((link) => {
                const url = link.url;
                const priority = CrawlPriority.urlScore({
                    url,
                    text: link.text ?? "",
                });

                return crawlJobService.createCrawlJob({ sourceUrl: url, priority });
            });

        return Promise.all(writes);
    }
}

export default crawlProcessor;

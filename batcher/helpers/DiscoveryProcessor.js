
import geoMapifyService from "../../discovery/processingServices/geoApifyService.js";
import wikipediaService from "../../discovery/processingServices/wikipediaService.js";
import rawEvidenceService from "../../discovery/rawEvidenceservice.js";

 const adapters = {
            geoMapify: geoMapifyService,
            wikipedia: wikipediaService,
        };
class discoveryProcessor {
    static async process(job) {
       
        const adapter = adapters[job.source];

        if (!adapter) {
            throw new Error(`Unsupported discovery source: ${job.source}`);
        }

        const documents = await adapter.getDocuments(job);

        await Promise.all(documents.map((document) => {

            return rawEvidenceService.createRawEvidence({
                discoveryJobId: job.id,
                sourceUrl: document.source_url ?? undefined,
                content: document.content,
            });
        }));

    }
}

export default discoveryProcessor;
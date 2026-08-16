import raw_evidence from "../../db/models/raw_evidence.js";


class RawEvidenceService {
    static async createRawEvidence({ discoveryJobId, sourceUrl, content }) {
        return raw_evidence.create({
            discovery_job_id: discoveryJobId,
            source_url: sourceUrl,
            content,
        });
    }
}

export default RawEvidenceService;

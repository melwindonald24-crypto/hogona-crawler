import raw_evidence from "../db/models/raw_evidence.js";

class rawEvidence{

    static async createRawEvidence({crawlJobId,discoveryJobId,sourceUrl,content}){

        const normalizedContent= content==="string"?content:JSON.stringify(content);
        const hash= crypto.createhash('sha256').update(normalizedContent).digest('hex');
        const existingEvidence= await raw_evidence.findOne({
            where:{
                content_hash:hash
            }
        });

        if(existingEvidence){
            return existingEvidence;
        }

        return raw_evidence.create({
            crawl_job_id:crawlJobId,
            discovery_job_id:discoveryJobId,
            source_url:sourceUrl,
            content:normalizedContent,
            content_hash:hash
        });
    }
}
export default rawEvidence;

import crawl_job from "../../../db/models/crawl_job.js";

class crawlJobService{

    static async createCrawlJob({sourceUrl,priority})
        {
            return await crawl_job.create(
                {
                    source_url:sourceUrl,
                    priority:priority
                }
            )

        }
    static async getPendingCrawlJobs(LIMIT=10)
    {
        const result=await crawl_job.findAll({
            where:{
                status:'pending'
            },
            order:[['priority','DESC']],
            limit:LIMIT
        })
        return result;
    }
    static async updateStatus({Job,status})
    {
        Job.status=status;
        return await Job.save();
    }    
}

export default crawlJobService;

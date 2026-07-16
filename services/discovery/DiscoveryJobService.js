
import discovery_job from "../../db/models/discovery_job.js";

class discoveryJobService{

   /* static async createDiscoveryJob({source,config}){
        return await discovery_job.create(
            {
                source,
                config
            }
        )
    } useful in next phase*/

    static async getPendingJobs(limit = 10) {
        return discovery_job.findAll({
            where:{
                status:"pending"
            },
            limit,
        });
    }
    static async updateStatus({Job,status})
    {
        Job.status=status;
        return await Job.save();
    }
    
}
export default discoveryJobService;

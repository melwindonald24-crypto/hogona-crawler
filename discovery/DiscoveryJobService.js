import discovery_job from "../db/models/discovery_job.js";

class discoveryJobService{

    static async createDiscoveryJob({source,config}){
        return await discovery_job.create(
            {
                source,
                config
            }
        )
    } 
    static async updateStatus({discoveryJob,status})
    {
        discoveryJob.status=status;
        return await discoveryJob.save();
    }
    
}
export default discoveryJobService;
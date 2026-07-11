import sequelize from './db/database.js';
import './db/models/crawl_job.js';
import './db/models/discovery_job.js';
import './db/models/raw_evidence.js'
import './db/models/gemma_extraction.js'
import './db/models/canidate_cluster.js'
import './db/models/cluster_member.js'

async function main()
{
    try{
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        await sequelize.sync();
        console.log(sequelize.models);
        console.log('Database synchronized successfully');
    }catch(error){
        console.error('Error occurred while synchronizing the database:', error);
    }
}
main();
  

import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const crawl_job=sequelize.define("crawl_job",{
    id:{
        type:DataTypes.UUID,
        defaultValue:DataTypes.UUIDV4,
        primaryKey:true
    },
    source_url:{
        type:DataTypes.STRING,
        allowNull:false
    },
    status:{
        type:DataTypes.ENUM('pending','running','completed','failed'),
        allowNull:false,
        defaultValue:'pending',
    
    },
    priority:{
        type:DataTypes.FLOAT,
        allowNull:true,
    }
    
},
    {
        tableName:'crawl_job',
        timestamps:true,
        underscored:true,
    }
)
export default crawl_job;

import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const discovery_job=sequelize.define("discovery_job",{
    id:{
        type:DataTypes.UUID,
        defaultValue:DataTypes.UUIDV4,
        primaryKey:true
    },
    source:{
        type:DataTypes.STRING,
        allowNull:false
    },
    status:{
        type:DataTypes.ENUM('pending','running','completed','failed'),
        allowNull:false,
        defaultValue:'pending',
    
    },
    config:{
        type:DataTypes.JSONB,
        allowNull:false,
    }
},
    {
        tableName:'discovery_job',
        timestamps:true,
        underscored:true,
    }
)
export default discovery_job;
import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const raw_evidence = sequelize.define(
    "raw_evidence",{
        id:{
            type: DataTypes.UUID,
            primaryKey:true,
            defaultValue: DataTypes.UUIDV4,
        },
        crawl_job_id:{
            type:DataTypes.UUID,
            allowNull:true,
            references:{
                model:'crawl_job',
                key:'id',
            }

        },
        discovery_job_id:{
            type:DataTypes.UUID,
            allowNull:true,
            references:{
                model:'discovery_job',
                key:'id',
            }
        },
        source_url:{
            type:DataTypes.STRING,
            allowNull:true,
        },
        content:{
            type:DataTypes.TEXT,
            allowNull:false,
        },
        content_hash:{
            type:DataTypes.STRING,
            allowNull:false,
            unique:true,
        },


    },{
        tableName:'raw_evidence',
        timestamps:true,
        createdAt:true,
        updatedAt:true,
        underscored:true,
    }
)
export default raw_evidence;
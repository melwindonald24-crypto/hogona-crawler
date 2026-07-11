import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const canidate_cluster=sequelize.define("canidate_cluster",{
    id:{
        type:DataTypes.UUID,
        primaryKey:true,
        defaultValue:DataTypes.UUIDV4,

    },
    proposed_name:{
        type:DataTypes.STRING,
        allowNull:false
    },
    status:{
        type:DataTypes.ENUM("PENDING","READY","COMPLETED"),
        allowNull:false,
        defaultValue:"PENDING"
    },

},{
    tableName:"canidate_cluster",
    timestamps:true,
    underscored:true
})

export default canidate_cluster
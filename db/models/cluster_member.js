import sequelize from "../database.js";
import { DataTypes } from "sequelize";

const cluster_member = sequelize.define("cluster_member", {
    gemma_extraction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: "gemma_extraction",
            key: "id",
        },
    },
    cluster_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "canidate_cluster",
            key: "id",
        },
    },
    match_score: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
},

    {
        tableName:"cluster_members",
        timestamps:false,
        underscored:true,
    }
)
export default cluster_member;
  
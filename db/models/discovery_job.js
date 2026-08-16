import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const discovery_job = sequelize.define(
    "discovery_job",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        source: {
            type: DataTypes.STRING,
            allowNull: false,
            
        },
        config: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("pending", "running", "completed", "failed"),
            allowNull: false,
            defaultValue: "pending",
        },
    },
    {
        tableName: "discovery_job",
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ["source", "config"] },
        ],
    },
);

export default discovery_job;

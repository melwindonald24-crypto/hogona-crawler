import { DataTypes } from "sequelize";
import sequelize from "../database.js";
import discovery_job from "./discovery_job.js";

const raw_evidence = sequelize.define(
    "raw_evidence",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        discovery_job_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: discovery_job, key: "id" },
        },
        source_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        content: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
    },
    {
        tableName: "raw_evidence",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["discovery_job_id"] },
        ],
    },
);

export default raw_evidence;

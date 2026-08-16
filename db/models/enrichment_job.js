import sequelize from "../database.js";
import { DataTypes } from "sequelize";


const enrichment_job = sequelize.define("enrichment_job", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    raw_evidence_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "raw_evidence", key: "id" },
    },
    source_place_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    place_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    district: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    input_data: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    output_data: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM("pending", "exported", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
    },
}, {
    tableName: "enrichment_job",
    timestamps: true,
    underscored: true,
});

export default enrichment_job;

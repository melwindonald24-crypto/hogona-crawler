import { DataTypes } from "sequelize";
import sequelize from "../database.js";


const gemma_extraction = sequelize.define("gemma_extraction", {
    id:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    raw_evidence_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "raw_evidence",
            key: "id",
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,

    },
    category: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
    },
    co_ordinates: {
        type: DataTypes.GEOMETRY("POINT", 4326),
        allowNull: true,
    },
    extracted_data: {
        type:DataTypes.JSONB,
        allowedNull:true,
    },
    confidence:{
        type:DataTypes.FLOAT,
        allowedNull:false
    },
    status:{
        type:DataTypes.ENUM("EXTRACTED","REVIEW"),
        allowedNull:false,
        defaultValue:"EXTRACTED"
    }


},{
    tableName: "gemma_extraction",
    timestamps: true,
    updatedAt: false,
    underscored: true,
})

export default gemma_extraction;
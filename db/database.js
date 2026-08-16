import "dotenv/config";
import { Sequelize } from "sequelize";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Add it to .env before running any script.");
}

const sequelize = new Sequelize(DATABASE_URL, {
    logging: false,
});

export default sequelize;

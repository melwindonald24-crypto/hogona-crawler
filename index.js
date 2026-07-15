import sequelize from './db/database.js';
import './db/models/dbindex.js';

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        await sequelize.sync();
        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Error occurred while synchronizing the database:', error);
        process.exitCode = 1;
    }
}
main();
  

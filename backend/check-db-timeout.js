require("dotenv").config();

const AppDataSource = require("./src/config/database");

async function checkTimeout() {
    try {
        await AppDataSource.initialize();

        console.time("Query execution");

        await AppDataSource.query("SELECT pg_sleep(10)");

        console.timeEnd("Query execution");

    } catch (error) {
        console.error(error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

checkTimeout();
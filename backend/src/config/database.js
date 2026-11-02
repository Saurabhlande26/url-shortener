const { DataSource } = require("typeorm");

const User = require("../entities/User");
const Url = require("../entities/Url");
const Click = require("../entities/Click");
const DB_POOL_MAX = 10;
const AppDataSource = new DataSource({
    type: "postgres",

    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
        User,
        Url,
        Click,
    ],
    migrations: ["src/migrations/*.js"],
    synchronize: false,

    logging: false,
    extra: {
        statement_timeout: 15000,
        max: DB_POOL_MAX,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    },
});

function getPoolStats() {
    if (!AppDataSource.isInitialized) {
        throw new Error("Database is not initialized");
    }

    const pool = AppDataSource.driver.master;

    return {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
    };
}

module.exports = AppDataSource;
module.exports.getPoolStats = getPoolStats;
module.exports.DB_POOL_MAX = DB_POOL_MAX;
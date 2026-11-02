const AppDataSource = require("../config/database");
const { getPoolStats } = require("../config/database");
const {
    DB_POOL_MAX,
} = require("../config/database");

const getDatabaseHealth = async (req, res) => {
    try {
        if (!AppDataSource.isInitialized) {
            return res.status(503).json({
                success: false,
                message: "Database is not connected",
            });
        }

        await AppDataSource.query("SELECT 1");

        const stats = getPoolStats();

        const utilization = Number(
            ((stats.totalConnections - stats.idleConnections) /
                DB_POOL_MAX) * 100
        ).toFixed(2);

        return res.status(200).json({
            success: true,
            database: "PostgreSQL",
            status: "connected",
            pool: {
                ...stats,
                utilization: `${utilization}%`,
            },
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            database: "PostgreSQL",
            status: "disconnected",
            message: "Database is unavailable",
        });
    }
};

module.exports = { getDatabaseHealth };
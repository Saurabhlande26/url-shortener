
require("dotenv").config();

const app = require("./app");
const AppDataSource = require("./config/database");
const redisClient = require("./config/redis");
const validateEnv = require("./config/validateEnv");

validateEnv();
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("PostgreSQL connected successfully");

    await redisClient.connect();
    console.log("Redis connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
}

startServer();

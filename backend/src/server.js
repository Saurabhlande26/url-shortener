require("dotenv").config();
const { getPoolStats } = require("./config/database");
const app = require("./app");
const AppDataSource = require("./config/database");
const redisClient = require("./config/redis");
const validateEnv = require("./config/validateEnv");

validateEnv();

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT = 8000; // 8 seconds
let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("PostgreSQL connected successfully");
    console.log("PostgreSQL Pool Stats:", getPoolStats());

    const queryPromises = Array.from({ length: 15 }, () =>
      AppDataSource.query("SELECT pg_sleep(5)")
    );

    setTimeout(() => {
      console.log("Pool Stats During Load:", getPoolStats());
    }, 1000);

    const results = await Promise.allSettled(queryPromises);

    const failedQueries = results.filter(
      (result) => result.status === "rejected"
    );

    failedQueries.forEach((result, index) => {
      console.log(`Failed Query ${index + 1}:`, {
        message: result.reason.message,
        code: result.reason.code,
      });
    });

    console.log("Successful queries:", results.filter(r => r.status === "fulfilled").length);
    console.log("Failed queries:", results.filter(r => r.status === "rejected").length);
    console.log("Pool Stats After Load:", getPoolStats());
    await redisClient.connect();
    console.log("Redis connected successfully");

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // HTTP server timeout configuration
    server.requestTimeout = 30000;    // 30 seconds
    server.headersTimeout = 15000;    // 15 seconds
    server.keepAliveTimeout = 5000;   // 5 seconds
    server.timeout = 60000; // 60 seconds
    // Handle socket inactivity timeout
    server.on("timeout", (socket) => {
      console.log("Socket inactivity timeout occurred");

      socket.destroy();
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  // Force shutdown if graceful shutdown takes too long
  const forceShutdownTimer = setTimeout(() => {
    if (server) {
      server.closeAllConnections?.();
    }

    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // 1. Stop accepting new HTTP requests
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      console.log("STEP 1.2: HTTP server closed");
    }

    if (redisClient.isOpen === true) {
      await redisClient.quit();
      console.log("Redis connection closed");
    } else {
      console.log("REDIS IF BLOCK NOT ENTERED");
    }

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    clearTimeout(forceShutdownTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
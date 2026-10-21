const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const AppDataSource = require("./config/database");
const redisClient = require("./config/redis");
const urlRoutes = require("./routes/url.routes");
const redirectRoutes = require("./routes/redirect.routes");
const analyticsRoutes = require("./routes/analytics.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  const redisStatus = redisClient.isReady ? "connected" : "disconnected";

  res.json({
    success: true,
    message: "URL Shortener API is running",
    redis: redisStatus,
  });
});

app.use("/api/urls", urlRoutes);
app.use("/", redirectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", analyticsRoutes);

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

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
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

module.exports = app;

const helmet = require("helmet");
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const redisClient = require("./config/redis");
const urlRoutes = require("./routes/url.routes");
const redirectRoutes = require("./routes/redirect.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const healthRoutes = require("./routes/health.routes");

const app = express();
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === "http://localhost:5173") {
        return callback(null, true);
      }

      return callback(null, false);
    },
  })
);
app.use(express.json());

app.use("/health", healthRoutes);

app.use("/api/urls", urlRoutes);
app.use("/", redirectRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", analyticsRoutes);
app.use(errorHandler);

module.exports = app;

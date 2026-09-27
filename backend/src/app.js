const express = require("express");
const cors = require("cors");
require("dotenv").config();

const AppDataSource = require("./config/database");

const urlRoutes = require("./routes/url.routes");
const redirectRoutes = require("./routes/redirect.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "URL Shortener API is running",
    });
});

app.use("/api/urls", urlRoutes);

app.use("/", redirectRoutes);

const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
    .then(() => {
        console.log("PostgreSQL connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database connection failed:", error);
    });
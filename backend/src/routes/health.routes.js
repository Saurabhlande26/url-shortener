const express = require("express");
const router = express.Router();

const {
    getDatabaseHealth,
} = require("../controllers/health.controller");

router.get("/db", getDatabaseHealth);

module.exports = router;
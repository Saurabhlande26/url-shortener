const express = require("express");

const {
    getAnalytics,
} = require("../controllers/analytics.controller");

const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
    "/urls/:id/analytics",
    authenticate,
    getAnalytics
);

module.exports = router;
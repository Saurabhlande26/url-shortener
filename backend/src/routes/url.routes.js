const express = require("express");
const { createUrl, } = require("../controllers/url.controller");
const rateLimiter = require("../middleware/rateLimit.middleware");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authenticate, rateLimiter, createUrl);

module.exports = router;
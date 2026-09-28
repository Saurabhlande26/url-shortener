const express = require("express");
const { createUrl, } = require("../controllers/url.controller");
const rateLimiter = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/", rateLimiter, createUrl);

module.exports = router;
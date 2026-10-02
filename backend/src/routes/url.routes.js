const express = require("express");
const { createUrl, getUrls, deleteUrl, } = require("../controllers/url.controller");
const rateLimiter = require("../middleware/rateLimit.middleware");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();
// This will create a short url
router.post("/", authenticate, rateLimiter, createUrl);
router.get("/", authenticate, getUrls);
router.delete("/:id", authenticate, deleteUrl);

module.exports = router;
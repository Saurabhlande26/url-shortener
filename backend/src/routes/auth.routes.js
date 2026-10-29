const express = require("express");

const {
    register,
    login,
} = require("../controllers/auth.controller");

const authRateLimiter = require("../middleware/authRateLimit.middleware");
const router = express.Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);

module.exports = router;
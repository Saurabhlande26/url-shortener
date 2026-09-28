const redisClient = require("../config/redis");

const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3;

async function rateLimiter(req, res, next) {
    try {
        // For now we don't have authentication,
        // so use the client IP.
        const identifier = req.ip;
        const key = `rate-limit:url-create:${identifier}`;

        const now = Date.now();
        const windowStart = now - WINDOW_SIZE;

        // Remove requests outside the current window
        await redisClient.zRemRangeByScore(
            key,
            0,
            windowStart
        );

        // Count requests in current window
        const requestCount = await redisClient.zCard(key);

        if (requestCount >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
            });
        }

        // Add current request
        await redisClient.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        // Keep Redis key from living forever
        await redisClient.pExpire(
            key,
            WINDOW_SIZE
        );

        next();

    } catch (error) {
        console.error("Rate limiter error:", error);

        // Don't break the application if Redis has a temporary problem.
        next();
    }
}

module.exports = rateLimiter;
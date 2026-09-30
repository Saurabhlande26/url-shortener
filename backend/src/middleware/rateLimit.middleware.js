const redisClient = require("../config/redis");

const WINDOW_SIZE = 60 * 60 * 1000;
const MAX_REQUESTS = 100;

async function rateLimiter(req, res, next) {
    try {
        const identifier = req.user
            ? `user:${req.user.id}`
            : `ip:${req.ip}`;

        const key = `rate-limit:url-create:${identifier}`;

        const now = Date.now();
        const windowStart = now - WINDOW_SIZE;

        await redisClient.zRemRangeByScore(
            key,
            0,
            windowStart
        );

        const requestCount =
            await redisClient.zCard(key);

        if (requestCount >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many requests. Please try again later.",
            });
        }

        await redisClient.zAdd(key, {
            score: now,
            value: `${now}-${Math.random()}`,
        });

        await redisClient.pExpire(
            key,
            WINDOW_SIZE
        );

        next();

    } catch (error) {
        console.error(
            "Rate limiter error:",
            error
        );

        next();
    }
}

module.exports = rateLimiter;
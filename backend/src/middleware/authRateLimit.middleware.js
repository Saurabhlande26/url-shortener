
const redisClient = require("../config/redis");

const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local windowSize = tonumber(ARGV[1])
  local maxRequests = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local requestId = ARGV[4]
  local windowStart = now - windowSize

  redis.call("ZREMRANGEBYSCORE", key, "-inf", windowStart)

  local requestCount = redis.call("ZCARD", key)

  if requestCount >= maxRequests then
    return 0
  end

  redis.call("ZADD", key, now, requestId)
  redis.call("PEXPIRE", key, windowSize)

  return 1
`;

async function authRateLimiter(req, res, next) {
    try {
        const key = `rate-limit:auth:${req.ip}`;
        const now = Date.now();
        const requestId = `${now}-${Math.random()}`;

        const allowed = await redisClient.eval(RATE_LIMIT_SCRIPT, {
            keys: [key],
            arguments: [
                String(WINDOW_SIZE),
                String(MAX_REQUESTS),
                String(now),
                requestId,
            ],
        });

        if (allowed === 0) {
            return res.status(429).json({
                success: false,
                message: "Too many authentication attempts. Please try again later.",
            });
        }

        return next();
    } catch (error) {
        console.error("Authentication rate limiter error:", error);

        return res.status(503).json({
            success: false,
            message: "Authentication service temporarily unavailable.",
        });
    }
}

module.exports = authRateLimiter;

const redisClient = require("../config/redis");

const URL_CACHE_TTL = 60 * 60 * 24; // 24 hours

async function getCachedUrl(shortCode) {
    return await redisClient.get(`url:${shortCode}`);
}

async function cacheUrl(shortCode, originalUrl) {
    await redisClient.set(
        `url:${shortCode}`,
        originalUrl,
        {
            EX: URL_CACHE_TTL,
        }
    );
}

async function deleteCachedUrl(shortCode) {
    await redisClient.del(`url:${shortCode}`);
}

module.exports = {
    getCachedUrl,
    cacheUrl,
    deleteCachedUrl,
};
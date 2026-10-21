const redisClient = require("../config/redis");

const URL_CACHE_TTL = 60 * 60 * 24; // 24 hours

async function getCachedUrl(shortCode) {
  const data = await redisClient.get(`url:${shortCode}`);

  if (!data) return null;

  console.log(data, "dR");
  return JSON.parse(data);
}

async function cacheUrl(shortCode, url) {
  const cacheData = {
    id: url.id,
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    userId: url.user?.id || null,
    isActive: url.isActive,
    expiresAt: url.expiresAt,
  };

  await redisClient.set(`url:${shortCode}`, JSON.stringify(cacheData), {
    EX: URL_CACHE_TTL,
  });
}

async function deleteCachedUrl(shortCode) {
  await redisClient.del(`url:${shortCode}`);
}

module.exports = { getCachedUrl, cacheUrl, deleteCachedUrl };

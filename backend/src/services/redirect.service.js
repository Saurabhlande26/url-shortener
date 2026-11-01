const AppDataSource = require("../config/database");
const { getCachedUrl, cacheUrl } = require("./cache.service");
const { NotFoundError } = require("../utils/errors");
const urlRepository = AppDataSource.getRepository("Url");
const AppError = require("../utils/AppError");

async function getOriginalUrl(shortCode) {
  // 1. Redis
  let url = await getCachedUrl(shortCode);

  if (url) console.log("Redis CACHE HIT:", shortCode);

  // 2. PostgreSQL if Redis MISS
  if (!url) {
    console.log("Redis CACHE MISS:", shortCode);

    const dbUrl = await urlRepository.findOne({
      where: { shortCode, isActive: true },
      relations: { user: true },
    });

    if (!dbUrl) {
      throw new NotFoundError("Short URL not found");
    }

    url = {
      id: dbUrl.id,
      shortCode: dbUrl.shortCode,
      originalUrl: dbUrl.originalUrl,
      userId: dbUrl.user?.id || null,
      isActive: dbUrl.isActive,
      expiresAt: dbUrl.expiresAt,
    };

    // Cache complete metadata
    await cacheUrl(shortCode, dbUrl);
  }

  // 3. Check active
  if (!url.isActive) {
    throw new AppError("Short URL is disabled", 410);
  }

  // 4. Check expiration
  if (url.expiresAt && new Date(url.expiresAt) <= new Date()) {
    throw new AppError("This short URL has expired", 410);
  }

  return url;
}

module.exports = { getOriginalUrl };

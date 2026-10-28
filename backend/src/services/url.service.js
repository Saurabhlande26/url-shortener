const AppDataSource = require("../config/database");
const generateShortCode = require("../utils/generateCode");
const isValidUrl = require("../utils/validateUrl");
const { deleteCachedUrl } = require("./cache.service");

const urlRepository = AppDataSource.getRepository("Url");

async function createShortUrl({ originalUrl, customAlias, userId }) {
  if (!originalUrl) throw new Error("Original URL is required");
  if (!isValidUrl(originalUrl)) throw new Error("Invalid URL");
  if (!userId) throw new Error("User authentication required");

  if (customAlias) {
    // ⭐ UPDATED
    const existingAlias = await urlRepository.findOne({
      where: { shortCode: customAlias },
    });
    if (existingAlias) throw new Error("Custom alias already exists");
  }

  let shortCode = customAlias;

  if (!shortCode) {
    let exists = true;

    while (exists) {
      shortCode = generateShortCode(6);
      const existing = await urlRepository.findOne({ where: { shortCode } });
      exists = !!existing;
    }
  }

  const url = urlRepository.create({
    shortCode,
    originalUrl,
    customAlias: customAlias || null,
    user: { id: userId },
  });
  return await urlRepository.save(url);
}

async function getUserUrls(userId) {
  return await urlRepository.find({
    where: { user: { id: userId } },
    order: { createdAt: "DESC" },
  });
}

async function deleteUserUrl(urlId, userId) {
  const url = await urlRepository.findOne({
    where: {
      id: urlId,
      user: { id: userId },
    },
  });

  if (!url) {
    const error = new Error("URL not found");
    error.statusCode = 404;
    throw error;
  }

  await urlRepository.remove(url);

  // Remove stale Redis cache
  await deleteCachedUrl(url.shortCode);

  return true;
}

module.exports = { createShortUrl, getUserUrls, deleteUserUrl };

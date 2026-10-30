const {
  createShortUrl,
  getUserUrls,
  deleteUserUrl,
} = require("../services/url.service");

async function createUrl(req, res) {
  const { originalUrl, customAlias } = req.body;

  const url = await createShortUrl({
    originalUrl,
    customAlias,
    userId: req.user.id,
  });

  return res.status(201).json({
    success: true,
    data: {
      id: url.id,
      shortCode: url.shortCode,
      shortUrl: `http://localhost:5000/${url.shortCode}`,
      originalUrl: url.originalUrl,
      clickCount: url.clickCount,
      createdAt: url.createdAt,
    },
  });
}

async function getUrls(req, res) {
  const urls = await getUserUrls(req.user.id);

  return res.status(200).json({
    success: true,
    data: urls.map((url) => ({
      id: url.id,
      shortCode: url.shortCode,
      shortUrl: `http://localhost:5000/${url.shortCode}`,
      originalUrl: url.originalUrl,
      clickCount: Number(url.clickCount),
      expiresAt: url.expiresAt,
      isActive: url.isActive,
      createdAt: url.createdAt,
    })),
  });
}

async function deleteUrl(req, res) {
  await deleteUserUrl(req.params.id, req.user.id);

  return res.status(200).json({
    success: true,
    message: "URL deleted successfully",
  });
}

module.exports = { createUrl, getUrls, deleteUrl };

const { getOriginalUrl } = require("../services/redirect.service");
const { publishClickEvent } = require("../services/analytics.stream");

async function redirectToOriginalUrl(req, res) {
  const { shortCode } = req.params;

  const url = await getOriginalUrl(shortCode);

  // Analytics should not block the redirect
  try {
    await publishClickEvent({
      urlId: url.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      referer: req.get("referer"),
    });
  } catch (error) {
    console.error("Failed to publish analytics event:", error);
  }

  return res.redirect(302, url.originalUrl);
}

module.exports = { redirectToOriginalUrl };
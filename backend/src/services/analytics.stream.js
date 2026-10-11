const redisClient = require("../config/redis");

const ANALYTICS_STREAM = "analytics:clicks";

async function publishClickEvent({
    urlId,
    ipAddress,
    userAgent,
    referer,
}) {
    await redisClient.xAdd(
        ANALYTICS_STREAM,
        "*",
        {
            urlId: String(urlId),
            ipAddress: ipAddress || "",
            userAgent: userAgent || "",
            referer: referer || "",
        }
    );
}

module.exports = {
    ANALYTICS_STREAM,
    publishClickEvent,
};
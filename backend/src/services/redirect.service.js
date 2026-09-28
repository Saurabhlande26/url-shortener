const AppDataSource = require("../config/database");

const {
    getCachedUrl,
    cacheUrl,
} = require("./cache.service");

const urlRepository = AppDataSource.getRepository("Url");

async function getOriginalUrl(shortCode) {

    // 1. Check Redis
    const cachedUrl = await getCachedUrl(shortCode);

    if (cachedUrl) {
        console.log("Redis CACHE HIT:", shortCode);

        const url = await urlRepository.findOne({
            where: {
                shortCode,
            },
        });

        if (url) {
            await urlRepository.increment(
                {
                    id: url.id,
                },
                "clickCount",
                1
            );
        }

        return cachedUrl;
    }

    console.log("Redis CACHE MISS:", shortCode);

    // 2. Redis miss → PostgreSQL
    const url = await urlRepository.findOne({
        where: {
            shortCode,
            isActive: true,
        },
    });

    if (!url) {
        const error = new Error("Short URL not found");
        error.statusCode = 404;
        throw error;
    }

    // 3. Check expiration
    if (
        url.expiresAt &&
        new Date(url.expiresAt) <= new Date()
    ) {
        const error = new Error("This short URL has expired");
        error.statusCode = 410;
        throw error;
    }

    // 4. Store URL in Redis
    await cacheUrl(
        shortCode,
        url.originalUrl
    );

    // 5. Increment click count
    await urlRepository.increment(
        {
            id: url.id,
        },
        "clickCount",
        1
    );

    return url.originalUrl;
}

module.exports = {
    getOriginalUrl,
};
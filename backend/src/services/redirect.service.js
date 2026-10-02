const AppDataSource = require("../config/database");

const {
    getCachedUrl,
    cacheUrl,
} = require("./cache.service");

const urlRepository = AppDataSource.getRepository("Url");

async function getOriginalUrl(shortCode) {
    // 1. Redis
    let url = await getCachedUrl(shortCode);
    if (url) {
        console.log("Redis CACHE HIT:", shortCode);
    }

    // 2. PostgreSQL if Redis MISS
    if (!url) {
        console.log("Redis CACHE MISS:", shortCode);

        const dbUrl = await urlRepository.findOne({
            where: {
                shortCode,
                isActive: true,
            },
            relations: {
                user: true,
            },
        });

        if (!dbUrl) {
            const error = new Error("Short URL not found");
            error.statusCode = 404;
            throw error;
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
        const error = new Error("Short URL is disabled");
        error.statusCode = 410;
        throw error;
    }

    // 4. Check expiration
    if (
        url.expiresAt &&
        new Date(url.expiresAt) <= new Date()
    ) {
        const error = new Error("This short URL has expired");
        error.statusCode = 410;
        throw error;
    }

    return url;
}

module.exports = {
    getOriginalUrl,
};
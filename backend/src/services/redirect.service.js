const AppDataSource = require("../config/database");

const urlRepository = AppDataSource.getRepository("Url");

async function getOriginalUrl(shortCode) {
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

    // Check expiration
    if (url.expiresAt && new Date(url.expiresAt) <= new Date()) {
        const error = new Error("This short URL has expired");
        error.statusCode = 410;
        throw error;
    }

    // Increment click count
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
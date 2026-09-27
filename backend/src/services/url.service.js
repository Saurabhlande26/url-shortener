const AppDataSource = require("../config/database");
const generateShortCode = require("../utils/generateCode");
const isValidUrl = require("../utils/validateUrl");

const urlRepository = AppDataSource.getRepository("Url");

async function createShortUrl({ originalUrl, customAlias, userId, }) {
    if (!originalUrl) {
        throw new Error("Original URL is required");
    }

    if (!isValidUrl(originalUrl)) {
        throw new Error("Invalid URL");
    }

    // Custom alias
    if (customAlias) {
        const existingAlias = await urlRepository.findOne({
            where: {
                customAlias,
            },
        });

        if (existingAlias) {
            throw new Error("Custom alias already exists");
        }
    }

    let shortCode = customAlias;

    // Generate random code if custom alias isn't provided
    if (!shortCode) {
        let exists = true;

        while (exists) {
            shortCode = generateShortCode(6);

            const existing = await urlRepository.findOne({
                where: {
                    shortCode,
                },
            });

            exists = !!existing;
        }
    }

    const url = urlRepository.create({
        shortCode,
        originalUrl,
        customAlias: customAlias || null,
        user: userId ? { id: userId } : null,
    });

    return await urlRepository.save(url);
}

module.exports = {
    createShortUrl,
};
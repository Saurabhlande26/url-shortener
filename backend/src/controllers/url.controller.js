const {
    createShortUrl,
} = require("../services/url.service");

async function createUrl(req, res) {
    try {
        const {
            originalUrl,
            customAlias,
        } = req.body;

        const url = await createShortUrl({
            originalUrl,
            customAlias,
            userId: req.user?.id || null,
        });

        return res.status(201).json({
            success: true,

            data: {
                id: url.id,
                shortCode: url.shortCode,
                shortUrl: `http://localhost:5000/${url.shortCode}`,
                originalUrl: url.originalUrl,
            },
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = {
    createUrl,
};
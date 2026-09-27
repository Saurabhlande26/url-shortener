const {
    getOriginalUrl,
} = require("../services/redirect.service");

async function redirectToOriginalUrl(req, res) {
    try {
        const { shortCode } = req.params;

        const originalUrl = await getOriginalUrl(shortCode);

        return res.redirect(302, originalUrl);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
}

module.exports = {
    redirectToOriginalUrl,
};
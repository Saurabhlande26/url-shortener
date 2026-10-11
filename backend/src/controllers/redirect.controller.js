const {
    getOriginalUrl,
} = require("../services/redirect.service");

const {
    recordClick,
} = require("../services/click.service");
const { publishClickEvent } = require("../services/analytics.stream");

async function redirectToOriginalUrl(req, res) {
    try {
        const { shortCode } = req.params;

        const url = await getOriginalUrl(shortCode);

        // Record analytics
        // recordClick before
        // publishClickEvent this will run by side worker
        await publishClickEvent({
            urlId: url.id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            referer: req.get("referer"),
        });

        return res.redirect(
            302,
            url.originalUrl
        );

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Something went wrong",
        });
    }
}

module.exports = {
    redirectToOriginalUrl,
};
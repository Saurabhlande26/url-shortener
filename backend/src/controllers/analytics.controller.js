const {
    getUrlAnalytics,
} = require("../services/click.service");

async function getAnalytics(req, res) {
    try {
        const { id } = req.params;

        const analytics = await getUrlAnalytics(
            id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            data: analytics,
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports = {
    getAnalytics,
};
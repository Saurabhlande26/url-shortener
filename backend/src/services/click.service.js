const AppDataSource = require("../config/database");

const clickRepository =
    AppDataSource.getRepository("Click");

const urlRepository =
    AppDataSource.getRepository("Url");

async function recordClick({
    urlId,
    ipAddress,
    userAgent,
    referer,
}) {
    const click = clickRepository.create({
        url: {
            id: urlId,
        },
        ipAddress,
        userAgent,
        referer,
    });

    return await clickRepository.save(click);
}

async function getUrlAnalytics(urlId, userId) {
    // First verify that the URL belongs to the logged-in user
    const url = await urlRepository.findOne({
        where: {
            id: urlId,
            user: {
                id: userId,
            },
        },
    });

    if (!url) {
        const error = new Error("URL not found");
        error.statusCode = 404;
        throw error;
    }

    // Total clicks
    const totalClicks = await clickRepository.count({
        where: {
            url: {
                id: urlId,
            },
        },
    });

    // Start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayClicks = await clickRepository
        .createQueryBuilder("click")
        .where("click.url_id = :urlId", { urlId })
        .andWhere(
            "click.created_at >= :startOfToday",
            { startOfToday }
        )
        .getCount();

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(
        sevenDaysAgo.getDate() - 7
    );

    const last7DaysClicks =
        await clickRepository
            .createQueryBuilder("click")
            .where("click.url_id = :urlId", { urlId })
            .andWhere(
                "click.created_at >= :sevenDaysAgo",
                { sevenDaysAgo }
            )
            .getCount();

    const timeline = await clickRepository
        .createQueryBuilder("click")
        .select(
            "DATE(click.created_at)",
            "date"
        )
        .addSelect(
            "COUNT(click.id)",
            "clicks"
        )
        .where(
            "click.url_id = :urlId",
            { urlId }
        )
        .andWhere(
            "click.created_at >= :sevenDaysAgo",
            { sevenDaysAgo }
        )
        .groupBy(
            "DATE(click.created_at)"
        )
        .orderBy(
            "DATE(click.created_at)",
            "ASC"
        )
        .getRawMany();

    return {
        url: {
            id: url.id,
            shortCode: url.shortCode,
            originalUrl: url.originalUrl,
        },
        summary: {
            totalClicks,
            todayClicks,
            last7DaysClicks,
        },
        timeline: timeline.map((item) => ({
            date: item.date,
            clicks: Number(item.clicks),
        })),
    };
}

module.exports = {
    recordClick,
    getUrlAnalytics,
};
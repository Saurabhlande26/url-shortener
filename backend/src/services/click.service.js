const AppDataSource = require("../config/database");

const clickRepository =
    AppDataSource.getRepository("Click");

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

module.exports = {
    recordClick,
};
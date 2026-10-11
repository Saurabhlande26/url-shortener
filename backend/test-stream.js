require("dotenv").config();

const redisClient = require("./src/config/redis");
const {
    publishClickEvent,
} = require("./src/services/analytics.stream");

async function test() {
    await redisClient.connect();
    await publishClickEvent({
        urlId: 1,
        ipAddress: "127.0.0.1",
        userAgent: "Chrome",
        referer: "http://localhost:3000",
    });

    console.log("Click event published");

    process.exit(0);
}

test();
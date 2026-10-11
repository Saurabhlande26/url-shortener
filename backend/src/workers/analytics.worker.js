require("dotenv").config();

const redisClient = require("../config/redis");
const AppDataSource = require("../config/database");

const {
    ANALYTICS_STREAM,
} = require("../services/analytics.stream");

const CONSUMER_GROUP = "analytics-workers";
const CONSUMER_NAME = `worker-${process.pid}`;

async function ensureConsumerGroup() {
    try {
        await redisClient.xGroupCreate(
            ANALYTICS_STREAM,
            CONSUMER_GROUP,
            "0",
            {
                MKSTREAM: true,
            }
        );

        console.log(
            `Consumer group created: ${CONSUMER_GROUP}`
        );
    } catch (error) {
        // BUSYGROUP means the group already exists
        if (!error.message.includes("BUSYGROUP")) {
            throw error;
        }
    }
}

async function processClickEvent(event) {
    const clickRepository =
        AppDataSource.getRepository("Click");

    const {
        urlId,
        ipAddress,
        userAgent,
        referer,
    } = event;

    const click = clickRepository.create({
        url: {
            id: urlId,
        },

        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        referer: referer || null,
    });

    await clickRepository.save(click);

    console.log(
        `Analytics saved for URL ${urlId}`
    );
}

async function startWorker() {
    await AppDataSource.initialize();

    console.log(
        "PostgreSQL connected for analytics worker"
    );

    await redisClient.connect();

    console.log(
        "Redis connected for analytics worker"
    );

    await ensureConsumerGroup();

    console.log(
        `Analytics worker started: ${CONSUMER_NAME}`
    );

    while (true) {
        try {
            const result = await redisClient.xReadGroup(
                CONSUMER_GROUP,
                CONSUMER_NAME,
                [
                    {
                        key: ANALYTICS_STREAM,
                        id: ">",
                    },
                ],
                {
                    COUNT: 10,
                    BLOCK: 5000,
                }
            );

            if (!result) {
                continue;
            }

            for (const stream of result) {
                for (const message of stream.messages) {
                    try {
                        await processClickEvent(
                            message.message
                        );

                        await redisClient.xAck(
                            ANALYTICS_STREAM,
                            CONSUMER_GROUP,
                            message.id
                        );

                        console.log(
                            `Processed event ${message.id}`
                        );
                    } catch (error) {
                        console.error(
                            `Failed to process ${message.id}:`,
                            error
                        );
                    }
                }
            }
        } catch (error) {
            console.error(
                "Analytics worker error:",
                error
            );

            await new Promise((resolve) =>
                setTimeout(resolve, 2000)
            );
        }
    }
}

startWorker().catch((error) => {
    console.error(
        "Worker failed to start:",
        error
    );

    process.exit(1);
});
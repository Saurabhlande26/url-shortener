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

async function processClickEvent(event, eventId) {
    const clickRepository =
        AppDataSource.getRepository("Click");

    const {
        urlId,
        ipAddress,
        userAgent,
        referer,
    } = event;

    await clickRepository
        .createQueryBuilder()
        .insert()
        .into("clicks")
        .values({
            url: {
                id: Number(urlId),
            },
            eventId,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            referer: referer || null,
        })
        .orIgnore(
            '(event_id) WHERE event_id IS NOT NULL DO NOTHING'
        )
        .execute();

    console.log(
        `Analytics event handled: ${eventId}`
    );
}

async function recoverPendingMessages() {
    const result = await redisClient.xAutoClaim(
        ANALYTICS_STREAM,
        CONSUMER_GROUP,
        CONSUMER_NAME,
        30000,
        "0-0",
        {
            COUNT: 10,
        }
    );

    const messages = result.messages || [];

    for (const message of messages) {
        try {
            await processClickEvent(
                message.message,
                message.id
            );

            await redisClient.xAck(
                ANALYTICS_STREAM,
                CONSUMER_GROUP,
                message.id
            );

            console.log(
                `Recovered and processed event ${message.id}`
            );
        } catch (error) {
            console.error(
                `Failed to recover ${message.id}:`,
                error
            );
        }
    }
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
    await recoverPendingMessages();
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
                            message.message,
                            message.id
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
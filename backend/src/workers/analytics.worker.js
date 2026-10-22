require("dotenv").config();

const redisClient = require("../config/redis");
const AppDataSource = require("../config/database");
const { ANALYTICS_STREAM } = require("../services/analytics.stream");

const ANALYTICS_STREAM_NAME =
  process.env.ANALYTICS_STREAM_NAME || ANALYTICS_STREAM;
const CONSUMER_GROUP =
  process.env.ANALYTICS_CONSUMER_GROUP || "analytics-workers";
const CONSUMER_NAME =
  process.env.ANALYTICS_CONSUMER_NAME || `worker-${process.pid}`;

const RECOVERY_IDLE_MS = Number(
  process.env.ANALYTICS_RECOVERY_IDLE_MS || 30000,
);

async function ensureConsumerGroup() {
  try {
    //This function makes sure your Redis consumer group exists.
    await redisClient.xGroupCreate(ANALYTICS_STREAM_NAME, CONSUMER_GROUP, "0", {
      MKSTREAM: true,
    });
    console.log(`Consumer group created: ${CONSUMER_GROUP}`);
  } catch (error) {
    // BUSYGROUP means the group already exists
    if (!error.message.includes("BUSYGROUP")) throw error;
  }
}

async function processClickEvent(event, eventId) {
  const { urlId, ipAddress, userAgent, referer } = event;
  const parsedUrlId = Number(urlId);

  if (!Number.isSafeInteger(parsedUrlId) || parsedUrlId <= 0) {
    throw new Error(`Invalid urlId for event ${eventId}`);
  }

  const clickRepository = AppDataSource.getRepository("Click");

  await clickRepository
    .createQueryBuilder()
    .insert()
    .into("clicks")
    .values({
      url: { id: parsedUrlId },
      eventId,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      referer: referer || null,
    })
    .orIgnore()
    .execute();

  console.log(`Analytics event handled: ${eventId}`);
}


async function recoverPendingMessages() {
  let cursor = "0-0";

  do {
    const result = await redisClient.xAutoClaim(
      ANALYTICS_STREAM_NAME,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      RECOVERY_IDLE_MS,
      cursor,
      { COUNT: 10 },
    );

    cursor = result.nextId || "0-0";
    const messages = result.messages || [];

    for (const message of messages) {
      try {
        await processClickEvent(message.message, message.id);
        await redisClient.xAck(
          ANALYTICS_STREAM_NAME,
          CONSUMER_GROUP,
          message.id,
        );
        console.log(`Recovered and processed event ${message.id}`);
      } catch (error) {
        console.error(`Failed to recover ${message.id}:`, error);
      }
    }
  } while (cursor !== "0-0");
}


async function startWorker() {
  await AppDataSource.initialize();
  console.log("PostgreSQL connected for analytics worker");

  await redisClient.connect();
  console.log("Redis connected for analytics worker");

  await ensureConsumerGroup();
  console.log(`Analytics worker started: ${CONSUMER_NAME}`);

  // Recover pending messages when the worker starts.
  await recoverPendingMessages();

  // Recover pending messages sequentially every 30 seconds.
  (async function recoveryLoop() {
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 30000));

      try {
        await recoverPendingMessages();
      } catch (error) {
        console.error("Pending message recovery failed:", error);
      }
    }
  })();

  while (true) {
    try {
      const result = await redisClient.xReadGroup(
        CONSUMER_GROUP,
        CONSUMER_NAME,
        [{ key: ANALYTICS_STREAM_NAME, id: ">" }],
        { COUNT: 10, BLOCK: 5000 },
      );
      // If no messages arrive during the blocking period, Redis can return no results, and the loop tries again.
      // Important: The worker doesn't need publishClickEvent() to call it directly. It is already running and waiting for messages in Redis.
      if (!result) continue;

      for (const stream of result) {
        for (const message of stream.messages) {
          try {
            // Insert into PostgreSQL
            await processClickEvent(message.message, message.id);
            // After successful processing, xAck() acknowledges it.
            // The worker uses XACK to remove the event from the pending list.
            await redisClient.xAck(
              ANALYTICS_STREAM_NAME,
              CONSUMER_GROUP,
              message.id,
            );
            console.log(`Processed event ${message.id}`);
          } catch (error) {
            console.error(`Failed to process ${message.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Analytics worker error:", error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

startWorker().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});


const { spawn } = require("child_process");
const { randomUUID } = require("crypto");
const AppDataSource = require("../../src/config/database");
const redisClient = require("../../src/config/redis");

jest.setTimeout(20000);

describe("Analytics worker integration", () => {
    let worker;
    let testUrl;
    let eventId;

    const stream = process.env.ANALYTICS_STREAM_NAME || "analytics:clicks";
    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        // Create a real URL record for the click's foreign key.
        const urlRepository = AppDataSource.getRepository("Url");
        testUrl = await urlRepository.save(
            urlRepository.create({
                originalUrl: "https://example.com/worker-test",
                shortCode: randomUUID().replace(/-/g, "").slice(0, 8),
                clickCount: 0,
                isActive: true,
            })
        );

        // Use a unique event ID to avoid collisions with previous runs.
        eventId = `integration-${randomUUID()}`;

        // Start the worker using the current test environment.
        worker = spawn(
            process.execPath,
            ["src/workers/analytics.worker.js"],
            {
                env: {
                    ...process.env,
                    NODE_ENV: "test",
                },
                stdio: ["ignore", "pipe", "pipe"],
            }
        );
        worker.stdout.on("data", (data) => {
            process.stdout.write(`[analytics-worker] ${data}`);
        });

        worker.stderr.on("data", (data) => {
            process.stderr.write(`[analytics-worker] ${data}`);
        });

        // Wait for the worker's Redis consumer group to be ready.
        const group = process.env.ANALYTICS_CONSUMER_GROUP;
        const consumer = process.env.ANALYTICS_CONSUMER_NAME;

        let ready = false;
        for (let i = 0; i < 50; i++) {
            try {
                const groups = await redisClient.xInfoGroups(stream);
                if (groups.some((item) => item.name === group)) {
                    ready = true;
                    break;
                }
            } catch (_) { }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        expect(ready).toBe(true);
        expect(consumer).toBe("integration-worker");
    });

    afterAll(async () => {
        if (worker && !worker.killed) {
            worker.kill("SIGTERM");
        }

        if (AppDataSource.isInitialized) {
            if (testUrl?.id) {
                await AppDataSource.getRepository("Click").delete({
                    url: { id: testUrl.id },
                }).catch(() => { });
                await AppDataSource.getRepository("Url").delete(testUrl.id).catch(() => { });
            }

            await AppDataSource.destroy();
        }

        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    });

    test("persists a Redis click event in PostgreSQL", async () => {
        await redisClient.xAdd(stream, "*", {
            urlId: String(testUrl.id),
            ipAddress: "127.0.0.1",
            userAgent: "Analytics-Worker-Integration-Test",
            referer: "https://example.com",
        });

        const clickRepository = AppDataSource.getRepository("Click");
        let savedClick;

        for (let i = 0; i < 50; i++) {
            savedClick = await clickRepository.findOne({
                where: {
                    url: { id: testUrl.id },
                    userAgent: "Analytics-Worker-Integration-Test",
                },
                order: { id: "DESC" },
            });

            if (savedClick) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        expect(savedClick).toBeDefined();
        expect(savedClick.ipAddress).toBe("127.0.0.1");
        expect(savedClick.referer).toBe("https://example.com");
    });
});

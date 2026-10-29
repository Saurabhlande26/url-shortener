
const request = require("supertest");
const app = require("../../src/app");
const AppDataSource = require("../../src/config/database");
const redisClient = require("../../src/config/redis");
const { randomUUID } = require("crypto");

describe("API integration tests", () => {
    let token;
    let createdUrlId;
    let createdShortCode;
    const email = `integration-${Date.now()}@example.com`;
    const password = "TestPassword123";
    const originalUrl = "https://example.com/integration-test";

    beforeAll(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        // Clear authentication rate-limit keys for integration tests.
        const keys = await redisClient.keys("rate-limit:auth:*");

        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    });

    afterAll(async () => {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });

    test("registers a new user in PostgreSQL", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({ email, password });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe(email);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.passwordHash).toBeUndefined();
    });

    test("logs in the registered user and returns a JWT", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ email, password });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.email).toBe(email);

        token = response.body.data.token;
    });

    test("rejects an invalid original URL", async () => {
        const response = await request(app)
            .post("/api/urls")
            .set("Authorization", `Bearer ${token}`)
            .send({
                originalUrl: "not-a-valid-url",
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Invalid URL");
    });

    test("rejects an incorrect password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "WrongPassword123" });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test("creates a short URL in PostgreSQL", async () => {

        const response = await request(app)
            .post("/api/urls")
            .set("Authorization", `Bearer ${token}`)
            .send({ originalUrl });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.originalUrl).toBe(originalUrl);
        expect(response.body.data.shortCode).toBeDefined();
        expect(response.body.data.id).toBeDefined();
        createdShortCode = response.body.data.shortCode;
        createdUrlId = response.body.data.id;
    });

    test("retrieves the user's saved URLs", async () => {
        const response = await request(app)
            .get("/api/urls")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const savedUrl = response.body.data.find(
            (url) => String(url.id) === String(createdUrlId)
        );

        expect(savedUrl).toBeDefined();
        expect(savedUrl.originalUrl).toBe(originalUrl);
    });

    test("redirects to the original URL and publishes a click event", async () => {
        const eventId = randomUUID();

        const stream = "analytics:clicks";
        const before = await redisClient.xLen(stream).catch(() => 0);

        const response = await request(app)
            .get(`/${createdShortCode}`)
            .set("User-Agent", "Integration-Test")
            .set("Referer", "https://example.com");

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe(originalUrl);

        // Allow the request's Redis publish to complete before checking the stream.
        const after = await redisClient.xLen(stream);

        expect(after).toBeGreaterThan(before);
    });


    test("rejects URL creation without authentication", async () => {
        const response = await request(app)
            .post("/api/urls")
            .send({
                originalUrl: "https://example.com/unauthorized-test",
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test("prevents a user from deleting another user's URL", async () => {
        // Register a second, independent user.
        const secondUser = {
            email: `other-user-${Date.now()}@example.com`,
            password: "OtherPassword123",
        };

        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send(secondUser);

        expect(registerResponse.status).toBe(201);

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send(secondUser);

        expect(loginResponse.status).toBe(200);

        const otherUserToken = loginResponse.body.data.token;

        // Attempt to delete the URL created by the first user.
        const deleteResponse = await request(app)
            .delete(`/api/urls/${createdUrlId}`)
            .set("Authorization", `Bearer ${otherUserToken}`);

        expect(deleteResponse.status).toBe(404);
        expect(deleteResponse.body.success).toBe(false);

        // Verify the original owner can still retrieve the URL.
        const ownerResponse = await request(app)
            .get("/api/urls")
            .set("Authorization", `Bearer ${token}`);

        expect(ownerResponse.status).toBe(200);
        expect(
            ownerResponse.body.data.some(
                (url) => String(url.id) === String(createdUrlId)
            )
        ).toBe(true);
    });

});

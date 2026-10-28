
jest.mock("../src/config/redis", () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

const redisClient = require("../src/config/redis");

const {
    getCachedUrl,
    cacheUrl,
    deleteCachedUrl,
} = require("../src/services/cache.service");

describe("cache.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        redisClient.get.mockResolvedValue(null);
        redisClient.set.mockResolvedValue("OK");
        redisClient.del.mockResolvedValue(1);
    });

    describe("getCachedUrl", () => {
        it("should return null when the cache key does not exist", async () => {
            const result = await getCachedUrl("abc123");

            expect(redisClient.get).toHaveBeenCalledWith("url:abc123");
            expect(result).toBeNull();
        });

        it("should parse and return cached URL data", async () => {
            const cachedData = {
                id: 1,
                shortCode: "abc123",
                originalUrl: "https://example.com",
                userId: "user-1",
                isActive: true,
                expiresAt: null,
            };

            redisClient.get.mockResolvedValue(JSON.stringify(cachedData));

            const consoleLog = jest
                .spyOn(console, "log")
                .mockImplementation(() => { });

            const result = await getCachedUrl("abc123");

            expect(result).toEqual(cachedData);
            expect(redisClient.get).toHaveBeenCalledWith("url:abc123");

            consoleLog.mockRestore();
        });

        it("should propagate Redis errors", async () => {
            redisClient.get.mockRejectedValue(new Error("Redis unavailable"));

            await expect(getCachedUrl("abc123")).rejects.toThrow(
                "Redis unavailable"
            );
        });


        it("should throw when cached data is invalid JSON", async () => {
            redisClient.get.mockResolvedValue("not-valid-json");

            const consoleLog = jest
                .spyOn(console, "log")
                .mockImplementation(() => { });

            await expect(getCachedUrl("abc123")).rejects.toThrow();

            consoleLog.mockRestore();
        });

    });

    describe("cacheUrl", () => {
        it("should store URL metadata with a 24-hour TTL", async () => {
            const url = {
                id: 1,
                shortCode: "abc123",
                originalUrl: "https://example.com",
                user: { id: "user-1" },
                isActive: true,
                expiresAt: null,
            };

            await cacheUrl("abc123", url);

            expect(redisClient.set).toHaveBeenCalledWith(
                "url:abc123",
                JSON.stringify({
                    id: 1,
                    shortCode: "abc123",
                    originalUrl: "https://example.com",
                    userId: "user-1",
                    isActive: true,
                    expiresAt: null,
                }),
                { EX: 86400 }
            );
        });

        it("should store null userId when the URL has no user", async () => {
            const url = {
                id: 2,
                shortCode: "public1",
                originalUrl: "https://example.org",
                user: null,
                isActive: true,
                expiresAt: null,
            };

            await cacheUrl("public1", url);

            const [, storedData] = redisClient.set.mock.calls[0];

            expect(JSON.parse(storedData).userId).toBeNull();
        });

        it("should propagate Redis errors", async () => {
            redisClient.set.mockRejectedValue(new Error("Redis unavailable"));

            await expect(
                cacheUrl("abc123", {
                    id: 1,
                    shortCode: "abc123",
                    originalUrl: "https://example.com",
                    user: null,
                    isActive: true,
                    expiresAt: null,
                })
            ).rejects.toThrow("Redis unavailable");
        });
    });

    describe("deleteCachedUrl", () => {
        it("should delete the URL cache key", async () => {
            await deleteCachedUrl("abc123");

            expect(redisClient.del).toHaveBeenCalledWith("url:abc123");
        });

        it("should propagate Redis errors", async () => {
            redisClient.del.mockRejectedValue(new Error("Redis unavailable"));

            await expect(deleteCachedUrl("abc123")).rejects.toThrow(
                "Redis unavailable"
            );
        });
    });
});
